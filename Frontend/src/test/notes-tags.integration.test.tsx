import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import NotesPage from "../pages/NotesPage";

const { showFeedbackMock, getMock, postMock, patchMock, editorMock } = vi.hoisted(() => {
  const showFeedbackMock = vi.fn();
  const getMock = vi.fn();
  const postMock = vi.fn();
  const patchMock = vi.fn();
  const setContentMock = vi.fn();

  const createChain = () => {
    const chain = {
      focus: vi.fn(() => chain),
      toggleBold: vi.fn(() => chain),
      toggleItalic: vi.fn(() => chain),
      toggleUnderline: vi.fn(() => chain),
      toggleStrike: vi.fn(() => chain),
      toggleHeading: vi.fn(() => chain),
      toggleBulletList: vi.fn(() => chain),
      toggleOrderedList: vi.fn(() => chain),
      toggleTaskList: vi.fn(() => chain),
      toggleCodeBlock: vi.fn(() => chain),
      toggleBlockquote: vi.fn(() => chain),
      setLink: vi.fn(() => chain),
      setTextAlign: vi.fn(() => chain),
      undo: vi.fn(() => chain),
      redo: vi.fn(() => chain),
      setContent: vi.fn(() => chain),
      run: vi.fn(() => true)
    };
    return chain;
  };

  const createCanChain = () => {
    const canChain = {
      focus: vi.fn(() => canChain),
      undo: vi.fn(() => canChain),
      redo: vi.fn(() => canChain),
      run: vi.fn(() => true)
    };
    return canChain;
  };

  const editorChain = createChain();
  const canChain = createCanChain();

  const editorMock = {
    chain: vi.fn(() => editorChain),
    can: vi.fn(() => ({ chain: vi.fn(() => canChain) })),
    commands: {
      setContent: setContentMock
    },
    getAttributes: vi.fn(() => ({ href: undefined })),
    getJSON: vi.fn(() => ({ type: "doc", content: [{ type: "paragraph" }] })),
    getText: vi.fn(() => "one two three")
  };

  return {
    showFeedbackMock,
    getMock,
    postMock,
    patchMock,
    editorMock
  };
});

vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: () => editorMock
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: () => ({})
  }
}));
vi.mock("@tiptap/extension-color", () => ({ default: {} }));
vi.mock("@tiptap/extension-highlight", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-link", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-placeholder", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-subscript", () => ({ default: {} }));
vi.mock("@tiptap/extension-superscript", () => ({ default: {} }));
vi.mock("@tiptap/extension-task-item", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-task-list", () => ({ default: {} }));
vi.mock("@tiptap/extension-text-align", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-text-style", () => ({ TextStyle: {} }));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));

vi.mock("../context/FeedbackContext", () => ({
  useFeedback: () => ({
    showFeedback: showFeedbackMock
  })
}));

vi.mock("../lib/api", () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock
  },
  extractApiError: (error: unknown) => (error instanceof Error ? error.message : "Unknown error")
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <NotesPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("notes page tag manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ data: [] });
  });

  it("blocks creating a tag when name is empty", async () => {
    renderPage();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/profile/tags");
    });

    await userEvent.click(screen.getByRole("button", { name: "Create Tag" }));

    expect(screen.getByText("Tag name is required")).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("sends selected tag_ids on save", async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          tag_id: "tag-1",
          name: "backend",
          color: null,
          description: null
        }
      ]
    });
    postMock.mockResolvedValueOnce({
      data: {
        note_id: "note-1",
        operation: "created",
        created_at: "2026-03-29T10:00:00.000Z",
        updated_at: "2026-03-29T10:00:00.000Z",
        last_viewed_at: null
      }
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "#backend" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "#backend" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/profile/notes",
        expect.objectContaining({
          tag_ids: ["tag-1"]
        })
      );
    });
  });

  it("patches tag color when color picker is changed", async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          tag_id: "tag-1",
          name: "backend",
          color: null,
          description: null
        }
      ]
    });
    patchMock.mockResolvedValueOnce({
      data: {
        tag_id: "tag-1",
        name: "backend",
        color: "#112233",
        description: null
      }
    });

    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("#backend").length).toBeGreaterThan(0);
    });

    const colorInputs = container.querySelectorAll('input[type="color"]');
    expect(colorInputs.length).toBeGreaterThan(1);

    fireEvent.change(colorInputs[1], { target: { value: "#112233" } });

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith("/profile/tags/tag-1", { color: "#112233" });
    });
  });
});
