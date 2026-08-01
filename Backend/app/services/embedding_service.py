"""
embedding_service.py

Handles everything between a saved note and a row in note_embeddings:
  - loading the sentence-transformer model once at startup
  - extracting plain text from Tiptap/ProseMirror JSONB
  - chunking along block boundaries (whole note if short enough)
  - embedding and upserting into note_embeddings
  - the background-task wrapper called from note_service

The embedding model (bge-small-en-v1.5) and the generation model (Gemini)
are fully decoupled — only this file knows which embedding model is in use.

BGE asymmetric prompting:
  - Stored chunks  → embedded as-is
  - Query at search time → prefix with QUERY_PREFIX before embedding
"""

import asyncio
import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.config.db_config import SessionLocal
from app.models.Note_Embedding_Model import NoteEmbedding

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# BGE expects this prefix on the *query* side only, not on stored chunks.
# Keep it here so qa_service can import it and stay in sync automatically.
# ---------------------------------------------------------------------------
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

# Chunking thresholds
_WHOLE_NOTE_WORD_LIMIT = 200   # notes shorter than this are embedded as one chunk
_MIN_CHUNK_WORDS = 30          # merge tiny blocks into the previous chunk rather than indexing alone

# ---------------------------------------------------------------------------
# Model singleton — loaded once, reused forever
# ---------------------------------------------------------------------------
_model = None


def load_embedding_model() -> None:
    """
    Call this from main.py on startup (add_event_handler or lifespan).
    Loads bge-small-en-v1.5 weights off disk once and keeps them in memory.
    Reading the weights on every request or every background task would add
    ~300ms of unnecessary latency.
    """
    global _model
    if _model is not None:
        return

    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        logger.info("Embedding model loaded: BAAI/bge-small-en-v1.5")
    except Exception:
        logger.exception("Failed to load embedding model — note embeddings will be unavailable")


def _get_model():
    if _model is None:
        raise RuntimeError("Embedding model not loaded. Call load_embedding_model() on startup.")
    return _model


# ---------------------------------------------------------------------------
# Tiptap/ProseMirror text extraction
# ---------------------------------------------------------------------------

def _node_type(node: dict) -> str:
    return node.get("type", "")


def _inline_text(node: dict) -> str:
    """Recursively pull plain text out of an inline node tree."""
    if _node_type(node) == "text":
        return node.get("text", "")
    fragments = []
    for child in node.get("content", []):
        fragments.append(_inline_text(child))
    return "".join(fragments)


def _extract_blocks(doc: Any) -> list[dict]:
    """
    Walk the Tiptap doc and return a flat list of blocks, each with:
      - "heading": nearest heading text above this block (or None)
      - "text": plain text of this block
    This structure is what the chunker uses.
    """
    if not isinstance(doc, dict):
        return []

    blocks = []
    current_heading: str | None = None

    for node in doc.get("content", []):
        ntype = _node_type(node)

        if ntype == "heading":
            text = _inline_text(node).strip()
            if text:
                current_heading = text
                blocks.append({"heading": None, "text": text})

        elif ntype in ("paragraph", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock"):
            text = _inline_text(node).strip()
            if text:
                blocks.append({"heading": current_heading, "text": text})

    return blocks


def extract_plain_text(tiptap_doc: Any) -> str:
    """Flat plain text of the whole note — used for word-count check."""
    return " ".join(b["text"] for b in _extract_blocks(tiptap_doc))


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _word_count(text: str) -> int:
    return len(text.split())


def _prepend_heading(heading: str | None, text: str) -> str:
    if heading and not text.startswith(heading):
        return f"{heading}: {text}"
    return text


def chunk_note(title_doc: Any, content_doc: Any) -> list[str]:
    """
    Returns a list of chunk strings ready to be embedded.

    Chunk 0 is always the title on its own. A query like "what's in my
    Bank Names note" is really a lookup by name, and a title diluted inside
    a block of proper-noun-heavy content (or, on long notes, orphaned as a
    side effect of the merge buffer) won't match that query reliably. Giving
    the title a clean, standalone vector fixes both.

    Content chunks come after: the whole note as one chunk if it's under
    _WHOLE_NOTE_WORD_LIMIT words, otherwise split along Tiptap block
    boundaries with tiny adjacent blocks merged upward and the nearest
    heading carried forward into each chunk.
    """
    title_text = _inline_text(title_doc).strip() if isinstance(title_doc, dict) else ""
    blocks = _extract_blocks(content_doc)
    all_text = " ".join(b["text"] for b in blocks)

    if not title_text and not all_text.strip():
        return []

    chunks: list[str] = []

    if title_text:
        chunks.append(f"Note titled '{title_text}'")

    if not all_text.strip():
        return chunks

    if _word_count(all_text) <= _WHOLE_NOTE_WORD_LIMIT:
        chunks.append(all_text)
        return chunks

    # Split along block boundaries, merging tiny blocks upward.
    # Title is intentionally excluded here — chunk 0 already covers it,
    # and mixing it back in is what orphaned it before.
    buffer: list[str] = []

    for block in blocks:
        text = _prepend_heading(block["heading"], block["text"])
        if _word_count(text) < _MIN_CHUNK_WORDS and buffer:
            buffer.append(text)
        else:
            if buffer:
                chunks.append(" ".join(buffer))
            buffer = [text]

    if buffer:
        chunks.append(" ".join(buffer))

    return [c for c in chunks if c.strip()]


# ---------------------------------------------------------------------------
# Core upsert — delete old rows, insert new ones
# ---------------------------------------------------------------------------

def _embed_texts(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def upsert_note_embeddings(note_id: uuid.UUID, user_id: int, title_doc: Any, content_doc: Any, db: Session) -> None:
    """
    Delete this note's existing embeddings, then embed and insert fresh ones.
    Called synchronously — always run inside asyncio.to_thread / run_in_threadpool
    so it doesn't block the event loop.
    """
    chunks = chunk_note(title_doc, content_doc)
    if not chunks:
        logger.info("note_id=%s produced no chunks — skipping embedding", note_id)
        return

    try:
        # Delete stale rows first so an update is always a clean replacement.
        db.query(NoteEmbedding).filter(NoteEmbedding.note_id == note_id).delete(synchronize_session=False)

        vectors = _embed_texts(chunks)

        for idx, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
            db.add(
                NoteEmbedding(
                    note_id=note_id,
                    user_id=user_id,
                    chunk_index=idx,
                    chunk_text=chunk_text,
                    embedding=vector,
                )
            )

        db.commit()
        logger.info("Upserted %d chunk(s) for note_id=%s", len(chunks), note_id)

    except Exception:
        db.rollback()
        logger.exception("Failed to upsert embeddings for note_id=%s", note_id)
        raise


# ---------------------------------------------------------------------------
# Background task wrapper — called from note_service after a successful save
# ---------------------------------------------------------------------------

async def embed_note_in_background(note_id: uuid.UUID, user_id: int, title_doc: Any, content_doc: Any) -> None:
    """
    Creates its own DB session (since the request session will be closed
    by the time this runs) and runs the CPU-bound embedding in a thread
    so it doesn't stall the event loop during encoding.
    """
    db = SessionLocal()
    try:
        await asyncio.to_thread(upsert_note_embeddings, note_id, user_id, title_doc, content_doc, db)
    except Exception:
        # Embedding failure must never surface to the user — the note is
        # already saved. Log and move on.
        logger.exception("Background embedding failed for note_id=%s — note saved but not indexed", note_id)
    finally:
        db.close()