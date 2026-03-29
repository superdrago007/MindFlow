import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthFormField from "../components/AuthFormField";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import api, { extractApiError } from "../lib/api";
import { isHardReloadNavigation } from "../lib/navigation";
import type { ForgotPasswordGenericResponse, ForgotPasswordSendOtpResponse } from "../types/forgotPassword";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isHardReloadNavigation(location.key)) {
      navigate("/login", { replace: true });
    }
  }, [location.key, navigate]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setServerError(null);

    try {
      await api.post<ForgotPasswordGenericResponse>("/forgotPassword/verifyEmail", {
        email: normalizedEmail
      });

      const sendOtpResponse = await api.post<ForgotPasswordSendOtpResponse>("/forgotPassword/sendotp", {
        email: normalizedEmail
      });

      const resendAfter = sendOtpResponse.data.resend_after_seconds ?? 60;
      navigate(`/otp?email=${encodeURIComponent(normalizedEmail)}`, {
        state: {
          resendAfter,
          initialLockRemaining:
            sendOtpResponse.data.is_locked && typeof sendOtpResponse.data.lock_remaining_seconds === "number"
              ? sendOtpResponse.data.lock_remaining_seconds
              : 0
        }
      });
    } catch (requestError) {
      setServerError(extractApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      showModeTabs={false}
      title="Verify your email"
      subtitle="Enter your email to receive a 6-digit OTP for password reset."
      footer={
        <p>
          Remembered your password?{" "}
          <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]" to="/login">
            Back to login
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthFormField
          id="verify-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          placeholder="you@example.com"
          error={error ?? undefined}
          onChange={setEmail}
        />

        {serverError ? <p className="rounded-xl border border-red-400/45 bg-red-500/12 px-3 py-2 text-sm text-red-500">{serverError}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Checking..." : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
