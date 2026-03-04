import type { LoginRequest, SignupRequest } from "../types/auth";

type LoginValidation = Partial<Record<keyof LoginRequest, string>>;

type SignupValidation = Partial<Record<keyof SignupRequest, string>>;

export function validateLoginForm(input: LoginRequest): LoginValidation {
  const errors: LoginValidation = {};

  if (!input.username.trim()) {
    errors.username = "Username is required.";
  }

  if (!input.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupForm(input: SignupRequest): SignupValidation {
  const errors: SignupValidation = {};
  const fullName = input.full_name.trim();
  const username = input.username.trim();
  const email = input.email.trim();

  if (fullName.length < 2 || fullName.length > 100) {
    errors.full_name = "Full name must be between 2 and 100 characters.";
  }

  if (username.length < 3 || username.length > 30) {
    errors.username = "Username must be between 3 and 30 characters.";
  }

  if (!emailRegex.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.password) {
    errors.password = "Password is required.";
  }

  return errors;
}
