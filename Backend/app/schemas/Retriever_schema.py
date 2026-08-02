from dataclasses import dataclass, field
import uuid


@dataclass
class ChunkMatch:
    """One row back from similarity_search — one chunk, not one note.
    A single note can appear more than once here if more than one of its
    chunks scored well (e.g. the title chunk and a content chunk both hit)."""

    note_id: uuid.UUID
    chunk_index: int
    chunk_text: str
    score: float  # cosine similarity: 1.0 = identical, 0.0 = orthogonal


@dataclass
class RetrievalResult:
    """What retrieve() hands back to the graph. has_results is checked by
    the graph's conditional edge to route to generate_answer or the
    canned no-match response — kept as an explicit field rather than making
    the caller re-derive it from an empty context string or empty list,
    since both of those are one accidental refactor away from meaning
    something else."""

    matches: list[ChunkMatch] = field(default_factory=list)
    titles: dict[uuid.UUID, str] = field(default_factory=dict)
    context: str = ""
    has_results: bool = False
