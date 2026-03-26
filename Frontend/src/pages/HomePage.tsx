import { Bell, BookOpen, Calendar, FileText, Link2, Plus, Search, Settings, Sparkles, Tag, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import IconActionButton from "../components/IconActionButton";
import StatTile from "../components/StatTile";
import TagChip from "../components/TagChip";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { minutesUntilExpiry } from "../lib/auth";
import api, { extractApiError } from "../lib/api";
import type { ProfileResponse, MetaDataResponse } from "../types/profile";
import type { RecentNotesResponse } from "../types/notes";

const suggestionItems = [
  "Connect: Project Planning <-> Sprint Goals",
  "Review notes from last month",
  "Tag React Performance as #tutorial"
];

const popularTagItems = [
  { name: "work", count: 15, tone: "blue" as const },
  { name: "learning", count: 12, tone: "green" as const },
  { name: "ideas", count: 8, tone: "purple" as const },
  { name: "backend", count: 7, tone: "orange" as const },
  { name: "frontend", count: 6, tone: "pink" as const }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { logout, user, session } = useAuth();
  const { showFeedback } = useFeedback();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [metadata, setMetadata] = useState<MetaDataResponse | null>(null);
  const [recentNotes, setRecentNotes] = useState<RecentNotesResponse>([]);
  const [recentNotesLoading, setRecentNotesLoading] = useState(false);
  const [recentNotesError, setRecentNotesError] = useState<string | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(() => minutesUntilExpiry(session?.accessTokenExpiresAt));
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setMinutesLeft(minutesUntilExpiry(session?.accessTokenExpiresAt));

    const interval = window.setInterval(() => {
      setMinutesLeft(minutesUntilExpiry(session?.accessTokenExpiresAt));
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session?.accessTokenExpiresAt]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await api.get<ProfileResponse>("/profile");
        if (!cancelled) {
          setProfile(response.data);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    };

    if (session?.accessToken) {
      void loadProfile();
    } else {
      setProfile(null);
    }

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const response = await api.get<MetaDataResponse>("/profile/metadata");
        if (!cancelled) {
          setMetadata(response.data);
        }
      } catch {
        if (!cancelled) {
          setMetadata(null);
        }
      }
    };

    if (session?.accessToken) {
      void loadMetadata();
    } else {
      setMetadata(null);
    }

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    let cancelled = false;

    const loadRecentNotes = async () => {
      setRecentNotesLoading(true);
      setRecentNotesError(null);

      try {
        const response = await api.get<unknown>("/profile/notes/recent", {
          params: { limit: 5 }
        });
        if (!cancelled) {
          setRecentNotes(Array.isArray(response.data) ? (response.data as RecentNotesResponse) : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRecentNotes([]);
          setRecentNotesError(extractApiError(error));
        }
      } finally {
        if (!cancelled) {
          setRecentNotesLoading(false);
        }
      }
    };

    if (session?.accessToken) {
      void loadRecentNotes();
    } else {
      setRecentNotes([]);
      setRecentNotesError(null);
      setRecentNotesLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const displayTotalNotes = metadata?.Total_Notes ?? "-";
  const displayTotalTags = metadata?.Total_Tags ?? "-";
  const displayTotalConnections = metadata?.Total_Connections ?? "-";
  const displayUser = profile?.username ?? user?.username ?? "user";
  const displayEmail = profile?.email ?? user?.email ?? "unknown@example.com";

  const stats = useMemo(
    () => [
      { icon: FileText, label: "Total Notes", value: `${displayTotalNotes}`, gradient: "bg-gradient-to-br from-blue-500 to-indigo-500" },
      { icon: Tag, label: "Tags", value: `${displayTotalTags}`, gradient: "bg-gradient-to-br from-emerald-500 to-teal-500" },
      { icon: Link2, label: "Connections", value: `${displayTotalConnections}`, gradient: "bg-gradient-to-br from-violet-500 to-fuchsia-500" },
      { icon: Sparkles, label: "Session Left", value: `${minutesLeft}m`, gradient: "bg-gradient-to-br from-amber-500 to-orange-500" }
    ],
    [displayTotalConnections, displayTotalNotes, displayTotalTags, minutesLeft]
  );

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    showFeedback(`Search for "${searchValue.trim() || "all notes"}" is UI-only for now.`);
  };

  return (
    <main className="aurora-bg min-h-screen overflow-x-hidden px-4 py-5 font-body text-[var(--text-primary)] sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="glass-panel-strong soft-glow fade-up rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[var(--shadow-button)]">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl">MindFlow</h1>
                <p className="text-xs text-[var(--text-secondary)] sm:text-sm">Signed in as {displayUser}</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
              <ThemeToggleButton />
              <IconActionButton
                label="Notifications"
                icon={Bell}
                onClick={() => showFeedback("Notifications panel is coming soon.")}
                className="text-[var(--text-primary)]"
              />
              <IconActionButton
                label="Settings"
                icon={Settings}
                onClick={() => showFeedback("Settings UI is coming soon.")}
                className="text-[var(--text-primary)]"
              />
              <IconActionButton
                label="Profile"
                icon={User}
                onClick={() => showFeedback(`Logged in as ${displayEmail}.`, "success")}
                className="text-[var(--text-primary)]"
              />
              <Button className="w-auto px-4" variant="ghost" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>

          <form className="relative" onSubmit={onSearch}>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search your knowledge base..."
              className="glass-control h-12 w-full rounded-xl pl-12 pr-24 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--focus-ring)]"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-strong)]"
            >
              Search
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatTile key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} gradientClassName={stat.gradient} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-panel fade-up rounded-[1.4rem] p-4 sm:p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Recent Notes</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-strong)]"
                onClick={() => navigate("/notes")}
              >
                <Plus className="h-4 w-4" />
                New Note
              </button>
            </div>

            <div className="space-y-3">
              {recentNotesLoading ? (
                <div className="glass-control rounded-xl p-4 text-sm text-[var(--text-secondary)]">Loading recent notes...</div>
              ) : null}

              {!recentNotesLoading && recentNotesError ? (
                <div className="rounded-xl border border-[color:var(--tone-warning-border)] bg-[color:var(--tone-warning-bg)] p-4 text-sm text-[color:var(--tone-warning-text)]">
                  Unable to load recent notes right now. {recentNotesError}
                </div>
              ) : null}

              {!recentNotesLoading && !recentNotesError && recentNotes.length === 0 ? (
                <div className="glass-control rounded-xl p-4 text-sm text-[var(--text-secondary)]">
                  No recent notes yet. Create your first note to see it here.
                </div>
              ) : null}

              {!recentNotesLoading && !recentNotesError
                ? recentNotes.map((note) => (
                    <button
                      key={note.note_id}
                      type="button"
                      onClick={() => navigate(`/notes?noteId=${encodeURIComponent(note.note_id)}`)}
                      className="glass-control elevate-hover w-full rounded-xl p-4 text-left"
                    >
                      <h3 className="break-words font-semibold text-[var(--text-primary)]">{note.title}</h3>
                      <p className="mt-2 break-words text-sm text-[var(--text-secondary)]">{note.preview}</p>
                      <div className="mt-3 flex items-center justify-end">
                        <span className="text-xs text-[var(--text-muted)]">{note.time}</span>
                      </div>
                    </button>
                  ))
                : null}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="glass-panel fade-up rounded-[1.4rem] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">AI Suggestions</h3>
              </div>
              <div className="space-y-2">
                {suggestionItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="glass-control elevate-hover w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text-secondary)]"
                    onClick={() => showFeedback(`Suggestion clicked: ${item}`)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[1.4rem] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[var(--text-secondary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">On This Day</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">1 year ago: Ideas for building a personal knowledge management system.</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
                onClick={() => navigate("/notes")}
              >
                Open note
              </button>
            </section>

            <section className="glass-panel rounded-[1.4rem] p-4">
              <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {popularTagItems.map((tag) => (
                  <TagChip
                    key={tag.name}
                    name={tag.name}
                    count={tag.count}
                    tone={tag.tone}
                    onClick={() => showFeedback(`Filter by #${tag.name} coming soon`)}
                  />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

