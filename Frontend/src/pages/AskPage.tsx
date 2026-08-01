import { ChevronLeft, FileText, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import IconActionButton from "../components/IconActionButton";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { useFeedback } from "../context/FeedbackContext";
import api, { extractApiError } from "../lib/api";
import type { AskRequest, AskResponse } from "../types/ask";

const suggestedQuestions = [
  "What did I write about LangGraph memory?",
  "How does my JWT refresh flow work?",
  "Summarize my pgvector indexing notes"
];

type AskMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  status?: "loading" | "done" | "error";
};

export default function AskPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showFeedback } = useFeedback();

  const initialPrompt = useMemo(() => searchParams.get("prompt")?.trim() ?? "", [searchParams]);
  const [input, setInput] = useState(initialPrompt);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const nextMessageIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInput(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const submitQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) {
      return;
    }

    const userMessageId = nextMessageIdRef.current;
    nextMessageIdRef.current += 1;
    const assistantMessageId = nextMessageIdRef.current;
    nextMessageIdRef.current += 1;

    setInput("");
    setIsAsking(true);
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text: trimmedQuestion },
      {
        id: assistantMessageId,
        role: "assistant",
        text: "Searching your notes...",
        status: "loading"
      }
    ]);

    try {
      const payload: AskRequest = { question: trimmedQuestion };
      const response = await api.post<AskResponse>("/ask/ask", payload);
      const answer = response.data.message?.trim() || "I did not receive an answer for that question.";

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId ? { ...message, text: answer, status: "done" } : message
        )
      );
    } catch (error) {
      const errorMessage = extractApiError(error);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                text: `I could not answer that yet. ${errorMessage}`,
                status: "error"
              }
            : message
        )
      );
      showFeedback(errorMessage, "warning");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <main className="aurora-bg min-h-screen overflow-x-hidden px-4 py-5 font-body text-[var(--text-primary)] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="glass-panel-strong soft-glow fade-up rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <IconActionButton
                label="Open notes"
                icon={FileText}
                onClick={() => navigate("/notes")}
                className="text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[var(--shadow-button)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl">Ask MindFlow</h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
                Ask questions about your notes and MindFlow will answer from the backend.
              </p>
            </div>

            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => navigate("/notes")}>
              Open Notes
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-panel fade-up flex min-h-[620px] flex-col rounded-[1.4rem] lg:col-span-2">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--tag-blue-bg)] text-[var(--accent)]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-lg text-[var(--text-primary)]">Ask anything about your notes</h2>
                  <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
                    Type a question below. Answers will appear here with source citations once the backend supports them.
                  </p>
                </div>
              ) : null}

              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      message.role === "user"
                        ? "fade-up max-w-[84%] rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm leading-relaxed text-white"
                        : `fade-up max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                            message.status === "error"
                              ? "border-[color:var(--tone-warning-border)] bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-text)]"
                              : "border-[var(--glass-border)] bg-[color:var(--glass-surface-strong)] text-[var(--text-primary)]"
                          }`
                    }
                  >
                    {message.status === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                        {message.text}
                      </span>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--glass-border)] p-4">
              <form
                className="relative"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitQuestion(input);
                }}
              >
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={input}
                  disabled={isAsking}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask a question about your notes..."
                  className="glass-control h-12 w-full rounded-xl pl-11 pr-14 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isAsking || !input.trim()}
                  aria-label="Send question"
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={isAsking}
                    onClick={() => void submitQuestion(question)}
                    className="glass-control rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[color:var(--glass-surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="glass-panel fade-up rounded-[1.4rem] p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Sources</h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Source notes will appear here when the backend starts returning citations for Ask answers.
              </p>
            </section>

            <section className="glass-panel rounded-[1.4rem] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Try Asking</h3>
              </div>
              <div className="space-y-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={isAsking}
                    onClick={() => void submitQuestion(question)}
                    className="glass-control elevate-hover w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
