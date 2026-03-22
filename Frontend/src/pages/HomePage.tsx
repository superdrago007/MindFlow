import { Bell, BookOpen, Calendar, FileText, Link2, Plus, Search, Settings, Sparkles, Tag, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import IconActionButton from "../components/IconActionButton";
import StatTile from "../components/StatTile";
import TagChip from "../components/TagChip";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { minutesUntilExpiry } from "../lib/auth";
import api from "../lib/api";
import type { ProfileResponse } from "../types/auth";

type RecentNote = {
  title: string;
  preview: string;
  tags: string[];
  time: string;
};

const recentNotes: RecentNote[] = [
  {
    title: "Project Planning Meeting",
    preview: "Discussed authentication flow, token refresh strategy, and task breakdown for the next sprint.",
    tags: ["work", "planning", "backend"],
    time: "2 hours ago"
  },
  {
    title: "React Performance Tips",
    preview: "Collected notes on memoization boundaries, expensive renders, and practical optimization checks.",
    tags: ["react", "frontend", "learning"],
    time: "Yesterday"
  },
  {
    title: "Book Notes: Atomic Habits",
    preview: "Small system changes outperform motivation spikes. Focus on friction and environment design.",
    tags: ["books", "productivity"],
    time: "3 days ago"
  }
];

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

  const displayUser = profile?.username ?? user?.username ?? "user";
  const displayEmail = profile?.email ?? user?.email ?? "unknown@example.com";

  const stats = useMemo(
    () => [
      { icon: FileText, label: "Total Notes", value: "47", gradient: "bg-gradient-to-br from-blue-500 to-blue-600" },
      { icon: Tag, label: "Tags", value: `${popularTagItems.length}`, gradient: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
      { icon: Link2, label: "Connections", value: "23", gradient: "bg-gradient-to-br from-purple-500 to-purple-600" },
      { icon: Sparkles, label: "Session Left", value: `${minutesLeft}m`, gradient: "bg-gradient-to-br from-orange-500 to-orange-600" }
    ],
    [minutesLeft]
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 font-body text-slate-800 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl">MindFlow</h1>
                <p className="text-xs text-indigo-100/90">Signed in</p>
                <p className="text-xs text-indigo-100">Signed in as {displayUser}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <IconActionButton
                label="Notifications"
                icon={Bell}
                onClick={() => showFeedback("Notifications panel is coming soon.")}
                className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              />
              <IconActionButton
                label="Settings"
                icon={Settings}
                onClick={() => showFeedback("Settings UI is coming soon.")}
                className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              />
              <IconActionButton
                label="Profile"
                icon={User}
                onClick={() => showFeedback(`Logged in as ${displayEmail}.`, "success")}
                className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              />
              <Button className="w-auto bg-white/15 px-4 text-white hover:bg-white/25" variant="ghost" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>

          <form className="relative" onSubmit={onSearch}>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search your knowledge base..."
              className="h-12 w-full rounded-xl border border-white/20 bg-white/10 pl-12 pr-24 text-sm text-white placeholder:text-white/70 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/25"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium transition hover:bg-white/30"
            >
              Search
            </button>
          </form>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatTile key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} gradientClassName={stat.gradient} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-slate-800">Recent Notes</h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  onClick={() => navigate("/notes")}
                >
                  <Plus className="h-4 w-4" />
                  New Note
                </button>
              </div>

              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <button
                    key={note.title}
                    type="button"
                    onClick={() => navigate("/notes")}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md"
                  >
                    <h3 className="font-semibold text-slate-800">{note.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{note.preview}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <TagChip key={tag} name={tag} tone="slate" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{note.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-slate-800">AI Suggestions</h3>
                </div>
                <div className="space-y-2">
                  {suggestionItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="w-full rounded-lg bg-white/70 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-white"
                      onClick={() => showFeedback(`Suggestion clicked: ${item}`)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">On This Day</h3>
                </div>
                <p className="text-sm text-slate-600">1 year ago: Ideas for building a personal knowledge management system.</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  onClick={() => navigate("/notes")}
                >
                  Open note
                </button>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-semibold text-slate-800">Popular Tags</h3>
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
        </div>
      </section>
    </main>
  );
}
