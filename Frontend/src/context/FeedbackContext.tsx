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
  info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800"
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
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${toneClassName[message.tone]}`}
          >
            <p className="flex-1 text-sm font-medium">{message.text}</p>
            <button
              type="button"
              className="rounded-md p-1 transition hover:bg-black/5"
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
