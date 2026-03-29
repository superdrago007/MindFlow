import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import api, { extractApiError } from "../lib/api";
import { isHardReloadNavigation } from "../lib/navigation";
import type { ForgotPasswordLockDetail, ForgotPasswordSendOtpResponse, ForgotPasswordVerifyOtpResponse } from "../types/forgotPassword";

type OtpPageLocationState = {
  resendAfter?: number;
  initialLockRemaining?: number;
};

type PersistedOtpState = {
  resend_available_at?: number;
  lock_until?: number;
};

type HttpErrorShape = {
  response?: {
    status?: number;
    data?: {
      detail?: unknown;
    };
  };
};

const OTP_LENGTH = 6;
const OTP_STATE_STORAGE_PREFIX = "mindflow:otp-state:";

function sanitizeOtpDigit(rawValue: string): string {
  const onlyDigits = rawValue.replace(/\D/g, "");
  return onlyDigits.slice(-1);
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function extractLockDetail(error: unknown): ForgotPasswordLockDetail | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const httpError = error as HttpErrorShape;
  if (httpError.response?.status !== 429) {
    return null;
  }

  const detail = httpError.response.data?.detail;
  if (!detail || typeof detail !== "object") {
    return null;
  }

  const lockDetail = detail as Partial<ForgotPasswordLockDetail>;
  if (!lockDetail.is_locked || typeof lockDetail.lock_remaining_seconds !== "number") {
    return null;
  }

  return {
    message: typeof lockDetail.message === "string" && lockDetail.message.trim() ? lockDetail.message : "Too many failed attempts. Try again later.",
    is_locked: true,
    lock_remaining_seconds: lockDetail.lock_remaining_seconds
  };
}

function getOtpStorageKey(email: string): string {
  return `${OTP_STATE_STORAGE_PREFIX}${email}`;
}

function readPersistedOtpState(email: string): PersistedOtpState {
  try {
    const raw = window.sessionStorage.getItem(getOtpStorageKey(email));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as PersistedOtpState;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writePersistedOtpState(email: string, state: PersistedOtpState): void {
  try {
    const hasValues = typeof state.resend_available_at === "number" || typeof state.lock_until === "number";
    const storageKey = getOtpStorageKey(email);

    if (!hasValues) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage is best-effort; ignore persistence failures.
  }
}

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as OtpPageLocationState;

  const email = useMemo(() => searchParams.get("email")?.trim().toLowerCase() ?? "", [searchParams]);
  const persistedState = useMemo(() => (email ? readPersistedOtpState(email) : {}), [email]);
  const persistedResendAfter = useMemo(() => {
    const resendAvailableAt = persistedState.resend_available_at;
    if (typeof resendAvailableAt !== "number") {
      return 0;
    }
    return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
  }, [persistedState]);
  const persistedLockAfter = useMemo(() => {
    const lockUntil = persistedState.lock_until;
    if (typeof lockUntil !== "number") {
      return 0;
    }
    return Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
  }, [persistedState]);
  const initialResendAfter = typeof locationState.resendAfter === "number" ? locationState.resendAfter : persistedResendAfter;
  const initialLockRemaining = typeof locationState.initialLockRemaining === "number" ? locationState.initialLockRemaining : persistedLockAfter;

  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [secondsLeft, setSecondsLeft] = useState(initialResendAfter);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(initialLockRemaining);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isLocked = lockRemainingSeconds > 0;

  useEffect(() => {
    if (isHardReloadNavigation(location.key)) {
      navigate("/login", { replace: true });
    }
  }, [location.key, navigate]);

  useEffect(() => {
    if (!email) {
      navigate("/verifyEmail", { replace: true });
    }
  }, [email, navigate]);

  const persistResendCountdown = (seconds: number) => {
    if (!email) {
      return;
    }

    const state = readPersistedOtpState(email);
    if (seconds > 0) {
      state.resend_available_at = Date.now() + seconds * 1000;
    } else {
      delete state.resend_available_at;
    }
    writePersistedOtpState(email, state);
  };

  const persistLockCountdown = (seconds: number) => {
    if (!email) {
      return;
    }

    const state = readPersistedOtpState(email);
    if (seconds > 0) {
      state.lock_until = Date.now() + seconds * 1000;
    } else {
      delete state.lock_until;
    }
    writePersistedOtpState(email, state);
  };

  useEffect(() => {
    if (!email) {
      return;
    }

    if (typeof locationState.resendAfter === "number") {
      persistResendCountdown(locationState.resendAfter);
    }

    if (typeof locationState.initialLockRemaining === "number") {
      persistLockCountdown(locationState.initialLockRemaining);
    }
  }, [email, locationState.initialLockRemaining, locationState.resendAfter]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) {
      persistResendCountdown(0);
    }
  }, [secondsLeft]);

  useEffect(() => {
    if (lockRemainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setLockRemainingSeconds((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [lockRemainingSeconds]);

  useEffect(() => {
    if (lockRemainingSeconds === 0) {
      persistLockCountdown(0);
    }
  }, [lockRemainingSeconds]);

  const clearOtpInputs = () => {
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    inputRefs.current[0]?.focus();
  };

  const updateDigit = (index: number, nextValue: string) => {
    setOtpDigits((previous) => {
      const copy = [...previous];
      copy[index] = nextValue;
      return copy;
    });
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    if (isLocked) {
      return;
    }

    const value = sanitizeOtpDigit(rawValue);
    updateDigit(index, value);
    setServerError(null);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      event.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? "");
    setOtpDigits(nextDigits);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLocked) {
      setServerError("Too many failed attempts. Try again later.");
      return;
    }

    const otp = otpDigits.join("");

    if (otp.length !== OTP_LENGTH) {
      setServerError("Enter all 6 digits.");
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const response = await api.post<ForgotPasswordVerifyOtpResponse>("/forgotPassword/verifyotp", {
        email,
        otp
      });

      navigate(`/resetPassword?email=${encodeURIComponent(email)}`, {
        state: {
          resetToken: response.data.reset_token
        }
      });
    } catch (requestError) {
      const lockDetail = extractLockDetail(requestError);
      if (lockDetail?.is_locked) {
        setLockRemainingSeconds(lockDetail.lock_remaining_seconds);
        persistLockCountdown(lockDetail.lock_remaining_seconds);
        setSecondsLeft(0);
        persistResendCountdown(0);
        clearOtpInputs();
        setServerError(lockDetail.message);
        return;
      }

      const message = extractApiError(requestError);
      if (message.toLowerCase().includes("wrong otp")) {
        setServerError("Wrong OTP");
      } else {
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || secondsLeft > 0 || resendSubmitting || isLocked) {
      return;
    }

    setResendSubmitting(true);
    setServerError(null);

    try {
      const response = await api.post<ForgotPasswordSendOtpResponse>("/forgotPassword/sendotp", { email });

      if (response.data.is_locked && typeof response.data.lock_remaining_seconds === "number" && response.data.lock_remaining_seconds > 0) {
        setLockRemainingSeconds(response.data.lock_remaining_seconds);
        persistLockCountdown(response.data.lock_remaining_seconds);
        setSecondsLeft(0);
        persistResendCountdown(0);
        clearOtpInputs();
        setServerError(response.data.message);
        return;
      }

      setLockRemainingSeconds(0);
      persistLockCountdown(0);
      setSecondsLeft(response.data.resend_after_seconds ?? 60);
      persistResendCountdown(response.data.resend_after_seconds ?? 60);
      clearOtpInputs();
    } catch (requestError) {
      const lockDetail = extractLockDetail(requestError);
      if (lockDetail?.is_locked) {
        setLockRemainingSeconds(lockDetail.lock_remaining_seconds);
        persistLockCountdown(lockDetail.lock_remaining_seconds);
        setSecondsLeft(0);
        persistResendCountdown(0);
        clearOtpInputs();
        setServerError(lockDetail.message);
        return;
      }

      setServerError(extractApiError(requestError));
    } finally {
      setResendSubmitting(false);
    }
  };

  return (
    <AuthLayout
      showModeTabs={false}
      title="Enter OTP"
      subtitle={`We sent a 6-digit OTP to ${email || "your email address"}.`}
      footer={
        <p>
          Entered the wrong email?{" "}
          <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]" to="/verifyEmail">
            Verify again
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleVerifyOtp} noValidate>
        <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={digit}
              inputMode="numeric"
              maxLength={1}
              disabled={isLocked || submitting}
              aria-label={`OTP digit ${index + 1}`}
              className="glass-control h-12 w-11 rounded-xl text-center text-lg font-semibold text-[var(--text-primary)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55 sm:h-14 sm:w-12"
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
            />
          ))}
        </div>

        <div className="text-center text-sm text-[var(--text-secondary)]">
          {isLocked ? (
            <p className="font-semibold text-[color:var(--tone-warning-text)]">Try again in {formatDuration(lockRemainingSeconds)}</p>
          ) : secondsLeft > 0 ? (
            <p>Resend OTP in {secondsLeft}s</p>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendSubmitting || isLocked}
              className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendSubmitting ? "Resending..." : "Resend OTP"}
            </button>
          )}
        </div>

        {serverError ? <p className="rounded-xl border border-red-400/45 bg-red-500/12 px-3 py-2 text-sm text-red-500">{serverError}</p> : null}

        <Button type="submit" disabled={submitting || isLocked}>
          {submitting ? "Verifying..." : "Verify OTP"}
        </Button>
      </form>
    </AuthLayout>
  );
}
