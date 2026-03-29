import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthFormField from "../components/AuthFormField";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import api, { extractApiError } from "../lib/api";
import type { ForgotPasswordResetResponse } from "../types/forgotPassword";

type ResetPasswordLocationState = {
  resetToken?: string;
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as ResetPasswordLocationState;

  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const resetToken = locationState.resetToken ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email || !resetToken) {
      navigate("/verifyEmail", { replace: true });
    }
  }, [email, navigate, resetToken]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let hasError = false;

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (confirmPassword !== newPassword) {
      setConfirmError("Passwords do not match.");
      hasError = true;
    } else {
      setConfirmError(null);
    }

    if (hasError) {
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post<ForgotPasswordResetResponse>("/forgotPassword/resetPassword", {
        email,
        reset_token: resetToken,
        new_password: newPassword
      });

      setSuccessMessage(response.data.message);
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (requestError) {
      setServerError(extractApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      showModeTabs={false}
      title="Set a new password"
      subtitle="Create your new password and continue to login."
      footer={
        <p>
          Back to{" "}
          <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]" to="/login">
            Login
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthFormField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          placeholder="Enter new password"
          error={passwordError ?? undefined}
          onChange={setNewPassword}
        />

        <AuthFormField
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          placeholder="Re-enter new password"
          error={confirmError ?? undefined}
          onChange={setConfirmPassword}
        />

        {serverError ? <p className="rounded-xl border border-red-400/45 bg-red-500/12 px-3 py-2 text-sm text-red-500">{serverError}</p> : null}
        {successMessage ? (
          <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-500">{successMessage}</p>
        ) : null}

        <Button type="submit" disabled={submitting || Boolean(successMessage)}>
          {submitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
