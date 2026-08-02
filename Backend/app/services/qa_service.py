"""
qa_service.py

The actual LangGraph behind Feature 2 — what ask_router calls instead of
returning a placeholder string. Four nodes, one branch, no checkpointer:
parse_question -> retrieve -> [has results?] -> generate_answer | no_results_response.

Retrieval itself lives in retriever_service.py, not here — this file is
purely the graph shape, the Gemini call, and the prompt. Keeping those
separate means retrieval quality and generation quality can be iterated on
and tested independently of each other.
"""

import logging
import os
from typing import TypedDict
from dotenv import load_dotenv



from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.retriever_service import RetrievalResult, retrieve

from langchain.chat_models import init_chat_model


logger = logging.getLogger("qa_service")


os.environ["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY")

model = "gemini-3.1-flash-lite"


# ---------------------------------------------------------------------------
# Graph state
# ---------------------------------------------------------------------------

class AskState(TypedDict):
    question: str
    user_id: int
    retrieval: RetrievalResult
    answer: str
    sources: list[dict]


# ---------------------------------------------------------------------------
# Structured output — Gemini returns this shape directly, so there's no
# separate "attach_citations" node parsing raw text after the fact.
# ---------------------------------------------------------------------------

class SourceCitation(BaseModel):
    note_id: str = Field(description="The note_id exactly as it appears in the notes below, unchanged")
    title: str = Field(description="The note's title")


class AnswerWithSources(BaseModel):
    answer: str = Field(description="A direct answer to the question, based only on the notes given below")
    sources: list[SourceCitation] = Field(
        default_factory=list,
        description="Only the notes actually used to answer — omit any given below that didn't end up mattering",
    )


_ANSWER_PROMPT = """
You are answering questions using ONLY the notes below.

Each note has this format:

--------------------------------
NOTE_ID: <note id>
TITLE: <title>

<content>
--------------------------------

Rules:

1. Use ONLY the provided notes.
2. Never use outside knowledge.
3. If the notes do not answer the question, clearly say so.
4. Every statement in your answer must come from one or more notes.
5. In "sources", include ONLY the notes that were actually used.
6. Copy NOTE_ID and TITLE exactly as they appear.
7. Do NOT invent note IDs or titles.
8. If your answer says the provided notes do not contain the answer, return an empty "sources" list.

Question:
{question}

Notes:
{context}
"""

# Built once at import time, same reasoning as loading the embedding model
# once at startup rather than per-request — constructing the client and
# compiling the graph are both cheap, but there's still no reason to redo
# either on every single question.
_llm = ChatGoogleGenerativeAI(model=model, temperature=0)
_structured_llm = _llm.with_structured_output(AnswerWithSources)


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def parse_question_node(state: AskState) -> dict:
    return {"question": state["question"].strip()}


def retrieve_node(state: AskState, config: RunnableConfig) -> dict:
    """
    The db session comes through config, not state. It's a live resource
    tied to the current request, not data — LangGraph's configurable
    mechanism exists precisely so request-scoped objects like this don't
    have to be crammed into the state schema (and don't have to survive
    being serialized by a checkpointer, though we're not using one here).
    """
    db: Session = config["configurable"]["db"]
    result = retrieve(db, state["user_id"], state["question"])
    return {"retrieval": result}


def route_after_retrieve(state: AskState) -> str:
    return "generate_answer" if state["retrieval"].has_results else "no_results_response"


def _source_notes_for_ui(retrieval: RetrievalResult, cited_sources: list[SourceCitation]) -> list[dict]:
    source_by_id = {
        str(note_id): {"note_id": str(note_id), "title": title}
        for note_id, title in retrieval.titles.items()
    }

    cited_ids = [
        source.note_id.strip()
        for source in cited_sources
        if source.note_id.strip() in source_by_id
    ]

    return [source_by_id[note_id] for note_id in dict.fromkeys(cited_ids)]


def generate_answer_node(state: AskState) -> dict:
    prompt = _ANSWER_PROMPT.format(question=state["question"], context=state["retrieval"].context)
    result: AnswerWithSources = _structured_llm.invoke(prompt)

    final_ans = {
        "answer": result.answer,
        "sources": _source_notes_for_ui(state["retrieval"], result.sources),
    }

    return final_ans


def no_results_response_node(state: AskState) -> dict:
    return {
        "answer": "I couldn't find anything in your notes that matches this question. Try rephrasing it, "
                  "or double-check the note you're thinking of actually exists.",
        "sources": [],
    }


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def _build_graph():
    graph = StateGraph(AskState)

    graph.add_node("parse_question", parse_question_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate_answer", generate_answer_node)
    graph.add_node("no_results_response", no_results_response_node)

    graph.set_entry_point("parse_question")
    graph.add_edge("parse_question", "retrieve")
    graph.add_conditional_edges(
        "retrieve",
        route_after_retrieve,
        {
            "generate_answer": "generate_answer",
            "no_results_response": "no_results_response",
        },
    )
    graph.add_edge("generate_answer", END)
    graph.add_edge("no_results_response", END)

    return graph.compile()


_compiled_graph = _build_graph()


def ask_question(db: Session, user_id: int, question: str) -> dict:
    """
    The one function ask_router needs to know about. Synchronous on purpose —
    retrieve_node's DB calls and generate_answer_node's Gemini call are both
    blocking, matching the rest of this codebase's sync SQLAlchemy layer.
    The router is responsible for running this off the event loop
    (run_in_threadpool), the same way note_router already does for
    embedding — this function itself doesn't need to know or care that
    it's being called from an async context.
    """
    final_state = _compiled_graph.invoke(
        {"question": question, "user_id": user_id},
        config={"configurable": {"db": db}},
    )
    return {"message": final_state["answer"], "sources": final_state["sources"]}
