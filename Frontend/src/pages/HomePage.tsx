import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { minutesUntilExpiry } from "../lib/auth";

export default function HomePage() {
  const { logout, user, session } = useAuth();
  const navigate = useNavigate();
  const [minutesLeft, setMinutesLeft] = useState(() => minutesUntilExpiry(session?.accessTokenExpiresAt));

  useEffect(() => {
    setMinutesLeft(minutesUntilExpiry(session?.accessTokenExpiresAt));

    const interval = window.setInterval(() => {
      setMinutesLeft(minutesUntilExpiry(session?.accessTokenExpiresAt));
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session?.accessTokenExpiresAt]);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-8 font-body text-ink-900 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-4xl rounded-panel bg-white p-6 shadow-panel sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.2em] text-coral-600">MindFlow Auth</p>
            <h1 className="mt-2 font-display text-3xl text-ink-900">Signed in</h1>
            <p className="mt-2 text-sm text-ink-600">This page is protected by client-side route guards.</p>
          </div>
          <div className="w-full max-w-[180px]">
            <Button variant="ghost" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-ink-100 bg-ink-50 p-4">
            <h2 className="font-display text-sm uppercase tracking-[0.16em] text-ink-600">User</h2>
            <p className="mt-3 text-sm text-ink-700"><span className="font-semibold text-ink-900">Username:</span> {user?.username ?? "-"}</p>
            <p className="mt-2 text-sm text-ink-700"><span className="font-semibold text-ink-900">Email:</span> {user?.email ?? "-"}</p>
            <p className="mt-2 text-sm text-ink-700"><span className="font-semibold text-ink-900">Role:</span> {user?.role ?? "-"}</p>
          </article>

          <article className="rounded-xl border border-ink-100 bg-white p-4">
            <h2 className="font-display text-sm uppercase tracking-[0.16em] text-ink-600">Session</h2>
            <p className="mt-3 text-sm text-ink-700">
              <span className="font-semibold text-ink-900">Access token expires in:</span> {minutesLeft} minute(s)
            </p>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-semibold text-ink-900">Profile picture:</span> {user?.profilePic ? "Available" : "Not set"}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
