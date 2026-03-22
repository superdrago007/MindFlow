import { BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { PropsWithChildren } from "react";

type AuthLayoutProps = PropsWithChildren<{
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  footer: React.ReactNode;
}>;

export default function AuthLayout({ mode, title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 font-body text-slate-800">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="hidden flex-col justify-between rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl lg:flex">
          <div>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <BookOpen className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-display text-4xl leading-tight">MindFlow</h1>
            <p className="mt-3 max-w-sm text-sm text-indigo-100/85">Your AI-powered second brain for connected notes and focused workflows.</p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-indigo-200" />
              <p className="text-sm text-indigo-100/85">
                Sessions are protected with token validation. Expired access is handled automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="my-auto">
          <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <h2 className="mt-4 font-display text-3xl text-slate-800">MindFlow</h2>
              <p className="mt-1 text-sm text-slate-500">Secure access to your workspace</p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <Link
                to="/login"
                className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                  mode === "login" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                  mode === "signup" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Sign Up
              </Link>
            </div>

            <header>
              <h3 className="font-display text-2xl text-slate-800">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </header>

            <div className="mt-6">{children}</div>
            <footer className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">{footer}</footer>
          </div>
        </div>
      </section>
    </main>
  );
}
