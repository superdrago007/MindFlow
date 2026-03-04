import type { PropsWithChildren } from "react";

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer: React.ReactNode;
}>;

export default function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-900 font-body text-ink-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(54,179,145,0.32),transparent_50%),radial-gradient(circle_at_85%_15%,rgba(239,111,79,0.26),transparent_40%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(26,36,50,0.92),rgba(47,66,90,0.8))]" />

      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div className="hidden flex-col justify-between py-6 lg:flex">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.24em] text-mint-500">MindFlow</p>
            <h1 className="mt-5 max-w-md font-display text-4xl leading-tight text-white">
              Focused work starts with a clean authentication flow.
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-100/80">
              This portal connects directly to your FastAPI backend for secure signup and login.
            </p>
          </div>

          <div className="rounded-panel border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-sm text-ink-100/80">Access tokens expire automatically. You will be redirected when a session is no longer valid.</p>
          </div>
        </div>

        <div className="my-auto rounded-panel border border-white/15 bg-white p-6 text-ink-900 shadow-panel sm:p-8">
          <header>
            <p className="font-display text-xs uppercase tracking-[0.21em] text-coral-600">Authentication</p>
            <h2 className="mt-3 font-display text-3xl text-ink-900">{title}</h2>
            <p className="mt-2 text-sm text-ink-600">{subtitle}</p>
          </header>

          <div className="mt-8">{children}</div>

          <footer className="mt-8 border-t border-ink-100 pt-5 text-sm text-ink-600">{footer}</footer>
        </div>
      </section>
    </main>
  );
}
