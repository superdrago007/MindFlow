import { Link, useNavigate } from "react-router-dom";
import AuthFormField from "../components/AuthFormField";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { validateLoginForm } from "../lib/validation";
import { useState } from "react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateLoginForm({ username, password });
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await login({ username: username.trim(), password }, rememberMe);
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
      title="Welcome back"
      subtitle="Sign in to continue to your MindFlow workspace."
      footer={
        <p>
          Need an account? <Link className="font-semibold text-coral-600 hover:text-coral-700" to="/signup">Create one</Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthFormField
          id="username"
          label="Username"
          autoComplete="username"
          value={username}
          placeholder="Enter your username"
          error={errors.username}
          onChange={setUsername}
        />

        <AuthFormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          placeholder="Enter your password"
          error={errors.password}
          onChange={setPassword}
        />

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-coral-600 focus:ring-coral-500"
          />
          Remember me for this browser session
        </label>

        {serverError ? <p className="rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 text-sm text-coral-700">{serverError}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
