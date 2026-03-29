import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthFormField from "../components/AuthFormField";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { validateSignupForm } from "../lib/validation";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateSignupForm({
      full_name: fullName,
      username,
      email,
      password
    });

    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await signup({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      }, rememberMe);
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      mode="signup"
      title="Create account"
      subtitle="Set up access to your MindFlow backend in less than a minute."
      footer={
        <p>
          Already registered?{" "}
          <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]" to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthFormField
          id="full_name"
          label="Full name"
          autoComplete="name"
          value={fullName}
          placeholder="e.g. Alex Morgan"
          error={errors.full_name}
          onChange={setFullName}
        />

        <AuthFormField
          id="username"
          label="Username"
          autoComplete="username"
          value={username}
          placeholder="Choose a username"
          error={errors.username}
          onChange={setUsername}
        />

        <AuthFormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          placeholder="you@example.com"
          error={errors.email}
          onChange={setEmail}
        />

        <AuthFormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          placeholder="Choose a password"
          error={errors.password}
          onChange={setPassword}
        />

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--glass-border)] bg-transparent"
          />
          Remember me for this browser session
        </label>

        <div className="text-sm">
          <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]" to="/verifyEmail">
            Forgot password?
          </Link>
        </div>

        {serverError ? <p className="rounded-xl border border-red-400/45 bg-red-500/12 px-3 py-2 text-sm text-red-500">{serverError}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
