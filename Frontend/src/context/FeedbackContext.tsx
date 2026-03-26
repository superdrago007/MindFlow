import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FeedbackTone = "info" | "success" | "warning";

type FeedbackMessage = {
  id: number;
  text: string;
  tone: FeedbackTone;
};

type FeedbackContextValue = {
  showFeedback: (text: string, tone?: FeedbackTone) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

const toneClassName: Record<FeedbackTone, string> = {
  info: "border-[color:var(--tone-info-border)] bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-text)]",
  success: "border-[color:var(--tone-success-border)] bg-[color:var(--tone-success-bg)] text-[color:var(--tone-success-text)]",
  warning: "border-[color:var(--tone-warning-border)] bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-text)]"
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const showFeedback = useCallback((text: string, tone: FeedbackTone = "info") => {
    setMessage({ id: Date.now(), text, tone });
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage((current) => (current?.id === message.id ? null : current));
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const value = useMemo(() => ({ showFeedback }), [showFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {message ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(90vw,360px)]">
          <div
            role="status"
            className={`fade-up pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-md ${toneClassName[message.tone]}`}
          >
            <p className="flex-1 text-sm font-medium">{message.text}</p>
            <button
              type="button"
              className="rounded-lg p-1 transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
              onClick={() => setMessage(null)}
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }

  return context;
}
