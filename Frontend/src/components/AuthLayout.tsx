import { BookOpen, Sparkles } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import ThemeToggleButton from "./ThemeToggleButton";

type AuthLayoutProps = PropsWithChildren<{
  mode?: "login" | "signup";
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  showModeTabs?: boolean;
}>;

export default function AuthLayout({
  mode = "login",
  title,
  subtitle,
  footer,
  children,
  showModeTabs = true
}: AuthLayoutProps) {
  return (
    <main className="aurora-bg min-h-screen px-4 py-6 font-body text-[var(--text-primary)] sm:px-6 sm:py-10">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <aside className="glass-panel-strong soft-glow hidden flex-col justify-between rounded-[2rem] p-8 text-[var(--text-primary)] lg:flex">
          <div>
            <div className="mb-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-button)]">
                <BookOpen className="h-7 w-7" />
              </div>
            </div>
            <h1 className="font-display text-4xl leading-tight">MindFlow</h1>
            <p className="mt-4 max-w-sm text-sm text-[var(--text-secondary)]">
              Shape your ideas into connected insight. Track notes, discover links, and stay in focused flow.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Token refresh and session checks keep your workspace protected while you stay focused on writing.
              </p>
            </div>
          </div>
        </aside>

        <div className="my-auto">
          <div className="glass-panel-strong mx-auto w-full max-w-md rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-button)]">
                  <BookOpen className="h-7 w-7" />
                </div>
                <h2 className="mt-4 font-display text-3xl">MindFlow</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Secure access to your workspace</p>
              </div>
              <ThemeToggleButton />
            </div>

            {showModeTabs ? (
              <div className="glass-control mb-6 grid grid-cols-2 gap-2 rounded-xl p-1">
                <Link
                  to="/login"
                  className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                    mode === "login"
                      ? "bg-[var(--accent)] text-white shadow-[var(--shadow-button)]"
                      : "text-[var(--text-secondary)] hover:bg-[color:var(--glass-surface)]"
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                    mode === "signup"
                      ? "bg-[var(--accent)] text-white shadow-[var(--shadow-button)]"
                      : "text-[var(--text-secondary)] hover:bg-[color:var(--glass-surface)]"
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            ) : null}

            <header>
              <h3 className="font-display text-2xl">{title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
            </header>

            <div className="mt-6">{children}</div>
            <footer className="mt-6 border-t border-[var(--glass-border)] pt-4 text-sm text-[var(--text-secondary)]">{footer}</footer>
          </div>
        </div>
      </section>
    </main>
  );
}
