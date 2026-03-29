export type ForgotPasswordEmailRequest = {
  email: string;
};

export type ForgotPasswordGenericResponse = {
  message: string;
  resend_after_seconds?: number;
};

export type ForgotPasswordSendOtpResponse = {
  message: string;
  resend_after_seconds: number;
  is_locked: boolean;
  lock_remaining_seconds?: number | null;
};

export type ForgotPasswordVerifyOtpRequest = {
  email: string;
  otp: string;
};

export type ForgotPasswordVerifyOtpResponse = {
  message: string;
  reset_token: string;
  expires_in: number;
};

export type ForgotPasswordResetRequest = {
  email: string;
  reset_token: string;
  new_password: string;
};

export type ForgotPasswordResetResponse = {
  message: string;
};

export type ForgotPasswordLockDetail = {
  message: string;
  is_locked: boolean;
  lock_remaining_seconds: number;
};
