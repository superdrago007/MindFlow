export type LoginRequest = {
  username: string;
  password: string;
};

export type SignupRequest = {
  full_name: string;
  username: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  username: string;
  email?: string | null;
  role: string;
  profile_pic?: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  refresh_token_expires_in: number;
};

export type SignupResponse = {
  username: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
  is_active?: boolean;
  profile_pic?: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  refresh_token_expires_in: number;
};

export type AuthResponse = LoginResponse | SignupResponse;

export type AuthUser = {
  username: string;
  email: string | null;
  role: string;
  fullName?: string | null;
  isActive?: boolean;
  profilePic: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};
