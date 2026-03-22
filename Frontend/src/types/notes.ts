export type SaveNoteRequest = {
  note_id?: string;
  title: Record<string, unknown>;
  content: Record<string, unknown>;
};

export type SaveNoteResponse = {
  note_id: string;
  operation: "created" | "updated";
  created_at?: string | null;
  updated_at?: string | null;
  last_viewed_at?: string | null;
};

export type RecentNoteCard = {
  note_id: string;
  title: string;
  preview: string;
  time: string;
};

export type RecentNotesResponse = RecentNoteCard[];

export type NoteDetailResponse = {
  note_id: string;
  title?: Record<string, unknown> | null;
  title_text: string;
  content: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
  last_viewed_at?: string | null;
};
