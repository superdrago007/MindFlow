export type TagSummary = {
  tag_id: string;
  name: string;
  color?: string | null;
};

export type TagItem = TagSummary & {
  description?: string | null;
  created_at?: string | null;
};

export type TagListResponse = TagItem[];

export type CreateTagRequest = {
  name: string;
  color?: string;
  description?: string;
};

export type UpdateTagRequest = {
  name?: string | null;
  color?: string | null;
  description?: string | null;
};
