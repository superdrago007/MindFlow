"""
retriever_service.py

The retrieval half of the Ask StateGraph — everything between "user typed
a question" and "here's a context block ready for Gemini." Framework-agnostic
on purpose: these are plain functions with plain inputs/outputs, not LangGraph
nodes. The graph in qa_service.py will call retrieve() directly; keeping the
logic here means it's testable without spinning up a graph, and reusable if
we ever want retrieval outside the Ask flow (a "related notes" feature, say).

Nothing here touches Gemini. generate_answer and the LLM call live in
qa_service.py, next to the graph itself.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.schemas.Retriever_schema import ChunkMatch,RetrievalResult
from app.models.Note_Embedding_Model import NoteEmbedding
from app.services.embedding_service import EMBEDDING_MODEL_NAME, embed_query

# Cosine similarity, not distance — higher is better. With normalized
# MiniLM vectors, unrelated short texts still often land around 0.1-0.2
# from shared common words, while genuinely related content tends to clear
# 0.4. This is a starting point, not a measured number — expect to tune it
# once there's real note data to test against.
_SIMILARITY_THRESHOLD = 0.35

# How many chunks similarity_search pulls back before any threshold check.
_TOP_K = 5


def _display_title_from_title_chunk(chunk_text: str) -> str:
    prefix = "Note titled '"
    suffix = "'"
    if chunk_text.startswith(prefix) and chunk_text.endswith(suffix):
        return chunk_text[len(prefix) : -len(suffix)]

    return chunk_text





def has_sufficient_matches(matches: list[ChunkMatch]) -> bool:
    """
    Gate on the single best match, not on every match clearing the bar.
    matches[1:] exist to give the LLM more to work with once we already
    know the question is answerable at all — they're supporting material,
    not independent proof the question has an answer.
    """
    return bool(matches) and matches[0].score >= _SIMILARITY_THRESHOLD


def similarity_search(db: Session, user_id: int, query_embedding: list[float], top_k: int = _TOP_K) -> list[ChunkMatch]:
    """
    Cosine search over every chunk this user owns — including chunk_index 0,
    the title chunk. Deliberately not filtered out: title chunks existing
    and being searchable in the first place was the whole point of giving
    titles their own clean embedding (the Bank Names fix). Excluding them
    here would quietly undo that.

    order_by(distance) ascending is what the HNSW index on note_embeddings
    is actually built to accelerate — it's a nearest-neighbor index, so an
    ORDER BY ... LIMIT query in this exact shape is the query it exists for.
    """
    distance = NoteEmbedding.embedding.cosine_distance(query_embedding)

    rows = (
        db.query(
            NoteEmbedding.note_id,
            NoteEmbedding.chunk_index,
            NoteEmbedding.chunk_text,
            distance.label("distance"),
        )
        .filter(
            NoteEmbedding.user_id == user_id,
            NoteEmbedding.embedding_model == EMBEDDING_MODEL_NAME,
        )
        .order_by(distance)
        .limit(top_k)
        .all()
    )

    # pgvector's cosine_distance is 1 - cosine_similarity for normalized
    # vectors, so flipping it back to similarity here means every caller
    # downstream reasons in "higher is better," not "lower is better" —
    # one direction to keep straight instead of two.
    return [
        ChunkMatch(note_id=r.note_id, chunk_index=r.chunk_index, chunk_text=r.chunk_text, score=1 - r.distance)
        for r in rows
    ]


def fetch_note_titles(db: Session, note_ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    """
    One query, note_id IN (...) AND chunk_index = 0, for every note_id that
    came back from similarity_search. No join to notes, no re-parsing the
    Tiptap JSON — the title is already sitting in note_embeddings as plain
    text because chunk_note() always emits it as chunk 0. This table is
    self-sufficient for retrieval; nothing here ever needs to touch the
    notes table.
    """
    if not note_ids:
        return {}

    rows = (
        db.query(NoteEmbedding.note_id, NoteEmbedding.chunk_text)
        .filter(
            NoteEmbedding.note_id.in_(note_ids),
            NoteEmbedding.chunk_index == 0,
            NoteEmbedding.embedding_model == EMBEDDING_MODEL_NAME,
        )
        .all()
    )
    return {note_id: _display_title_from_title_chunk(chunk_text) for note_id, chunk_text in rows}


def build_context(matches: list[ChunkMatch], titles: dict[uuid.UUID, str]) -> str:
    """
    Groups chunks by note rather than listing them in raw score order —
    if two chunks from the same note both matched, Gemini should read them
    as one note's content, not two unrelated fragments that happen to be
    adjacent in a list. note_id is printed into the block itself, in the
    exact string form the LLM needs to echo back, because asking a model to
    remember an ID it saw once versus copy one sitting right in front of it
    is the difference between a reliable citation and a hallucinated one.
    """
    by_note: dict[uuid.UUID, list[ChunkMatch]] = defaultdict(list)
    for match in matches:
        by_note[match.note_id].append(match)

    blocks = []
    for note_id, note_matches in by_note.items():
        title = titles.get(note_id, "Untitled note")

        # chunk_index 0 is the title chunk — leaving it out of the content
        # line avoids showing "Note titled 'X'" twice, once as the header
        # and once as a line of content underneath it.
        content = "\n".join(m.chunk_text for m in note_matches if m.chunk_index != 0)

        # A note can legitimately have no non-title match — its title chunk
        # alone was the best hit, nothing from its body cleared the cut.
        # Falling back to the title keeps the block non-empty rather than
        # handing Gemini a note with nothing under its own heading.
        if not content:
            content = title

        blocks.append(f"NOTE_ID: {note_id}\nTITLE: {title}\n\n{content}")

    return "\n\n---\n\n".join(blocks)


def retrieve(db: Session, user_id: int, question: str, top_k: int = _TOP_K) -> RetrievalResult:
    """
    The single entry point qa_service.py's graph actually calls — embed,
    search, gate, fetch titles, build context, in that order. Everything
    above this function is here to be independently testable; this is here
    to be the one thing the graph needs to know about.
    """
    query_embedding = embed_query(question)
    matches = similarity_search(db, user_id, query_embedding, top_k=top_k)

    if not has_sufficient_matches(matches):
        return RetrievalResult()

    note_ids = list({m.note_id for m in matches})
    titles = fetch_note_titles(db, note_ids)
    context = build_context(matches, titles)

    return RetrievalResult(matches=matches, titles=titles, context=context, has_results=True)
