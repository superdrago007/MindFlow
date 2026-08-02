export type AskRequest = {
  question: string;
};

export type AskSource = {
  note_id: string;
  title: string;
};

export type AskResponse = {
  message: string;
  sources?: AskSource[];
};
