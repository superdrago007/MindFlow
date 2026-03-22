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
import { useFeedback } from "../context/FeedbackContext";
import api, { extractApiError } from "../lib/api";
import type { NoteDetailResponse, SaveNoteRequest, SaveNoteResponse } from "../types/notes";

const emptyNoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }]
};

const initialContent = `
  <h1>Meeting Agenda</h1>
  <p>Today we discussed the implementation of the new authentication system. Key points:</p>
  <ul>
    <li>Move to JWT-based authentication</li>
    <li>Implement refresh token rotation</li>
    <li>Prepare OAuth2 hooks for future use</li>
  </ul>
  <h2>Action Items</h2>
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="false"><p>Research JWT libraries for FastAPI</p></li>
    <li data-type="taskItem" data-checked="false"><p>Design refresh token schema</p></li>
    <li data-type="taskItem" data-checked="true"><p>Review OAuth2 documentation</p></li>
  </ul>
  <blockquote><p>Remember to consider rate-limiting for login attempts.</p></blockquote>
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

  const [title, setTitle] = useState("Project Planning Meeting");
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
    <main className="min-h-screen bg-slate-100 px-4 py-6 font-body text-slate-800 sm:px-6">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-800"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{lastSavedLabel}</span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
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
              />
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-4 w-full border-none px-0 font-display text-3xl text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Untitled Note"
          />
        </header>

        <div className="note-toolbar border-b border-slate-200 bg-slate-50 px-3 py-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
          <section className="lg:col-span-2">
            <div className="note-editor px-5 py-6 sm:px-6">
              <EditorContent editor={editor} />
            </div>

            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
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

          <aside className="bg-slate-50 p-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Assistant
            </h3>

            <section className="mb-5">
              <p className="mb-2 text-sm font-medium text-slate-700">Tags</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagChip key={tag} name={tag} tone="blue" onClick={() => showFeedback(`Tag selected: #${tag}`)} />
                ))}
              </div>
              <button type="button" className="text-sm font-medium text-indigo-600 hover:text-indigo-700" onClick={onAddTagClick}>
                + Add tag
              </button>
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Suggested Tags</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-200"
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

            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Related Notes</p>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-50 p-2 text-left transition hover:bg-slate-100"
                  onClick={() => showFeedback("Opened related note: OAuth Implementation")}
                >
                  <p className="text-sm font-medium text-slate-700">OAuth Implementation</p>
                  <p className="text-xs text-slate-500">Match 0.89</p>
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-50 p-2 text-left transition hover:bg-slate-100"
                  onClick={() => showFeedback("Opened related note: Security Best Practices")}
                >
                  <p className="text-sm font-medium text-slate-700">Security Best Practices</p>
                  <p className="text-xs text-slate-500">Match 0.76</p>
                </button>
              </div>
            </section>

            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                onClick={() => showFeedback("Summary generation will be connected soon.")}
              >
                Summarize Note
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                onClick={() => showFeedback("Connection discovery will be connected soon.")}
              >
                Find Connections
              </button>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
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
