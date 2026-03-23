export type ProfileResponse = {
  user_id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  role: string;
  is_active: boolean;
  profile_pic?: string | null;
};

export type MetaDataResponse = {
  Total_Notes: number;
  Total_Tags: number;
  Total_Connections: number;
};

