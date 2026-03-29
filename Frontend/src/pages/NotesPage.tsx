import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  MoreHorizontal,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import IconActionButton from "../components/IconActionButton";
import TagChip from "../components/TagChip";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { useFeedback } from "../context/FeedbackContext";
import api, { extractApiError } from "../lib/api";
import type { NoteDetailResponse, SaveNoteRequest, SaveNoteResponse } from "../types/notes";

const emptyNoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }]
};

const initialContent = `
  <h1>Content</h1>
`;

const suggestedTags = ["security", "authentication", "planning"];

type ToolbarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
};

const exclusiveToolbarGroups: string[][] = [
  ["heading-1", "heading-2"],
  ["align-left", "align-center", "align-right"]
];

function buildTitleDocument(titleText: string): Record<string, unknown> {
  const text = titleText.trim() || "Untitled Note";

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  };
}

function formatLastSavedLabel(timestamp?: string | null): string {
  if (!timestamp) {
    return "Last saved: Not yet";
  }

  const savedAt = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `Last saved: ${savedAt}`;
}

export default function NotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showFeedback } = useFeedback();
  const requestedNoteId = searchParams.get("noteId");

  const [title, setTitle] = useState("Title");
  const [tags, setTags] = useState<string[]>(["work", "planning", "backend"]);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState("Last saved: Not yet");
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(new Set());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https"
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: "Write your note here..." })
    ],
    content: initialContent
  });

  useEffect(() => {
    if (!editor || !requestedNoteId) {
      return;
    }

    let cancelled = false;

    const loadExistingNote = async () => {
      setIsLoadingNote(true);

      try {
        const response = await api.get<NoteDetailResponse>(`/profile/notes/${requestedNoteId}`);
        if (cancelled) {
          return;
        }

        const note = response.data;
        setNoteId(note.note_id);
        setTitle(note.title_text || "Untitled Note");
        setLastSavedLabel(formatLastSavedLabel(note.updated_at ?? note.created_at));
        editor.commands.setContent(note.content);
      } catch (error) {
        if (!cancelled) {
          showFeedback(extractApiError(error), "warning");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNote(false);
        }
      }
    };

    void loadExistingNote();

    return () => {
      cancelled = true;
    };
  }, [editor, requestedNoteId, showFeedback]);

  const toolbarItems = useMemo<ToolbarItem[]>(
    () => [
      {
        id: "bold",
        label: "Bold",
        icon: Bold,
        onClick: () => editor?.chain().focus().toggleBold().run()
      },
      {
        id: "italic",
        label: "Italic",
        icon: Italic,
        onClick: () => editor?.chain().focus().toggleItalic().run()
      },
      {
        id: "underline",
        label: "Underline",
        icon: UnderlineIcon,
        onClick: () => editor?.chain().focus().toggleUnderline().run()
      },
      {
        id: "strike",
        label: "Strike",
        icon: Strikethrough,
        onClick: () => editor?.chain().focus().toggleStrike().run()
      },
      {
        id: "heading-1",
        label: "Heading 1",
        icon: Heading1,
        onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run()
      },
      {
        id: "heading-2",
        label: "Heading 2",
        icon: Heading2,
        onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        id: "bullet-list",
        label: "Bullet List",
        icon: List,
        onClick: () => editor?.chain().focus().toggleBulletList().run()
      },
      {
        id: "ordered-list",
        label: "Ordered List",
        icon: ListOrdered,
        onClick: () => editor?.chain().focus().toggleOrderedList().run()
      },
      {
        id: "checklist",
        label: "Checklist",
        icon: ListChecks,
        onClick: () => editor?.chain().focus().toggleTaskList().run()
      },
      {
        id: "code-block",
        label: "Code",
        icon: Code,
        onClick: () => editor?.chain().focus().toggleCodeBlock().run()
      },
      {
        id: "quote",
        label: "Quote",
        icon: Quote,
        onClick: () => editor?.chain().focus().toggleBlockquote().run()
      },
      {
        id: "link",
        label: "Link",
        icon: Link2,
        onClick: () => {
          if (!editor) {
            return;
          }
          const currentLink = editor.getAttributes("link").href as string | undefined;
          const nextLink = window.prompt("Enter URL", currentLink ?? "https://");
          if (nextLink) {
            editor.chain().focus().setLink({ href: nextLink.trim() }).run();
          }
        }
      },
      {
        id: "align-left",
        label: "Align Left",
        icon: AlignLeft,
        onClick: () => editor?.chain().focus().setTextAlign("left").run()
      },
      {
        id: "align-center",
        label: "Align Center",
        icon: AlignCenter,
        onClick: () => editor?.chain().focus().setTextAlign("center").run()
      },
      {
        id: "align-right",
        label: "Align Right",
        icon: AlignRight,
        onClick: () => editor?.chain().focus().setTextAlign("right").run()
      },
      {
        id: "undo",
        label: "Undo",
        icon: Undo2,
        onClick: () => editor?.chain().focus().undo().run(),
        disabled: !editor?.can().chain().focus().undo().run()
      },
      {
        id: "redo",
        label: "Redo",
        icon: Redo2,
        onClick: () => editor?.chain().focus().redo().run(),
        disabled: !editor?.can().chain().focus().redo().run()
      }
    ],
    [editor]
  );

  const saveNote = async () => {
    if (!editor || isSaving || isLoadingNote) {
      return;
    }

    setIsSaving(true);

    try {
      const payload: SaveNoteRequest = {
        title: buildTitleDocument(title),
        content: editor.getJSON() as Record<string, unknown>,
        ...(noteId ? { note_id: noteId } : {})
      };

      const response = await api.post<SaveNoteResponse>("/profile/notes", payload);
      const operationLabel = response.data.operation === "created" ? "created" : "updated";

      setNoteId(response.data.note_id);
      setLastSavedLabel(formatLastSavedLabel(response.data.updated_at ?? response.data.created_at));
      showFeedback(`Note ${operationLabel} in database.`, "success");
    } catch (error) {
      showFeedback(extractApiError(error), "warning");
    } finally {
      setIsSaving(false);
    }
  };

  const printJson = () => {
    if (!editor) {
      return;
    }

    console.log("Generated note JSON", editor.getJSON());
    showFeedback("Editor JSON printed to browser console.", "info");
  };

  const openNewNote = () => {
    if (!editor || isLoadingNote) {
      return;
    }

    navigate("/notes", { replace: true });
    setNoteId(null);
    setTitle("Untitled Note");
    setLastSavedLabel("Last saved: Not yet");
    editor.chain().focus().setContent(emptyNoteContent).run();
    showFeedback("Opened a fresh note canvas.", "success");
  };

  const addTag = (nextTag: string) => {
    const normalized = nextTag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) {
      return;
    }
    setTags((current) => [...current, normalized]);
  };

  const onAddTagClick = () => {
    const response = window.prompt("Add tag");
    if (!response) {
      return;
    }
    addTag(response);
  };

  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0;

  const onToolbarClick = (item: ToolbarItem) => {
    item.onClick();
    setSelectedButtons((current) => {
      const next = new Set(current);
      const isSelected = next.has(item.id);

      if (isSelected) {
        next.delete(item.id);
        return next;
      }

      const group = exclusiveToolbarGroups.find((candidate) => candidate.includes(item.id));
      if (group) {
        for (const member of group) {
          next.delete(member);
        }
      }

      next.add(item.id);
      return next;
    });
  };

  return (
    <main className="aurora-bg min-h-screen overflow-x-hidden px-4 py-5 font-body text-[var(--text-primary)] sm:px-6">
      <section className="glass-panel-strong soft-glow mx-auto max-w-7xl overflow-hidden rounded-[1.75rem]">
        <header className="border-b border-[var(--glass-border)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
              <span className="w-full text-right text-xs text-[var(--text-muted)] sm:w-auto sm:text-left">{lastSavedLabel}</span>
              <ThemeToggleButton />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={saveNote}
                disabled={!editor || isSaving || isLoadingNote}
              >
                <Save className="h-4 w-4" />
                {isLoadingNote ? "Loading..." : isSaving ? "Saving..." : "Save"}
              </button>
              <IconActionButton
                label="More Actions"
                icon={MoreHorizontal}
                onClick={() => showFeedback("More actions menu is coming soon.")}
                className="text-[var(--text-primary)]"
              />
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-4 w-full border-none bg-transparent px-0 font-display text-3xl text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            placeholder="Untitled Note"
          />
        </header>

        <div className="note-toolbar border-b border-[var(--glass-border)] px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {toolbarItems.map((item) => (
              <IconActionButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={selectedButtons.has(item.id)}
                compact
                disabled={!editor || item.disabled}
                onClick={() => onToolbarClick(item)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-[var(--glass-border)]">
          <section className="lg:col-span-2">
            <div className="note-editor px-5 py-6 sm:px-6">
              <EditorContent editor={editor} />
            </div>

            <div className="border-t border-[var(--glass-border)] px-5 py-4 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={printJson} disabled={!editor}>
                  Print JSON
                </Button>
                <Button variant="ghost" onClick={openNewNote} disabled={!editor}>
                  Open New Note
                </Button>
              </div>
            </div>
          </section>

          <aside className="glass-panel p-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              AI Assistant
            </h3>

            <section className="mb-5">
              <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Tags</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagChip key={tag} name={tag} tone="blue" onClick={() => showFeedback(`Tag selected: #${tag}`)} />
                ))}
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
                onClick={onAddTagClick}
              >
                + Add tag
              </button>
            </section>

            <section className="glass-control mb-4 rounded-xl p-3">
              <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Suggested Tags</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-surface)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[color:var(--glass-surface-strong)]"
                    onClick={() => {
                      addTag(tag);
                      showFeedback(`Added #${tag}`, "success");
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-control mb-4 rounded-xl p-3">
              <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Related Notes</p>
              <div className="space-y-2">
                <button
                  type="button"
                  className="elevate-hover w-full rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-surface)] p-2 text-left"
                  onClick={() => showFeedback("Opened related note: OAuth Implementation")}
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">OAuth Implementation</p>
                  <p className="text-xs text-[var(--text-muted)]">Match 0.89</p>
                </button>
                <button
                  type="button"
                  className="elevate-hover w-full rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-surface)] p-2 text-left"
                  onClick={() => showFeedback("Opened related note: Security Best Practices")}
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Security Best Practices</p>
                  <p className="text-xs text-[var(--text-muted)]">Match 0.76</p>
                </button>
              </div>
            </section>

            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[color:var(--tag-purple-bg)] px-3 py-2 text-sm font-semibold text-[color:var(--tag-purple-text)] transition hover:brightness-105"
                onClick={() => showFeedback("Summary generation will be connected soon.")}
              >
                Summarize Note
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[color:var(--tag-blue-bg)] px-3 py-2 text-sm font-semibold text-[color:var(--tag-blue-text)] transition hover:brightness-105"
                onClick={() => showFeedback("Connection discovery will be connected soon.")}
              >
                Find Connections
              </button>
            </div>

            <div className="mt-5 border-t border-[var(--glass-border)] pt-4 text-xs text-[var(--text-muted)]">
              <p>Word count: {wordCount}</p>
              <p>Reading time: ~1 min</p>
              <p>Created: Mar 18, 2026</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
