import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import AskPage from "../pages/AskPage";

const { postMock, showFeedbackMock, navigateMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  showFeedbackMock: vi.fn(),
  navigateMock: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock("../lib/api", () => ({
  default: {
    post: postMock
  },
  extractApiError: (error: unknown) => (error instanceof Error ? error.message : "Unknown error")
}));

vi.mock("../context/FeedbackContext", () => ({
  useFeedback: () => ({
    showFeedback: showFeedbackMock
  })
}));

function renderAskPage(initialPath = "/ask") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <AskPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("ask page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a question and renders the backend answer with source note links", async () => {
    let resolveFirstAnswer: (value: {
      data: { message: string; sources: { note_id: string; title: string }[] };
    }) => void = () => {};
    let resolveSecondAnswer: (value: { data: { message: string; sources: never[] } }) => void = () => {};
    postMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFirstAnswer = resolve;
      })
    );
    postMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstAnswer = resolve;
      })
    );
    postMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecondAnswer = resolve;
      })
    );

    renderAskPage();

    expect(screen.getByText("Ask anything about your notes")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Ask a question about your notes..."), "How does auth work?");
    await userEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByText("How does auth work?")).toBeInTheDocument();
    expect(screen.getByText("Searching your notes...")).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith("/ask/ask", { question: "How does auth work?" });

    resolveFirstAnswer({
      data: {
        message: "Backend placeholder answer.",
        sources: [{ note_id: "note-1", title: "Auth Flow" }]
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Backend placeholder answer.")).toBeInTheDocument();
    });
    expect(screen.getByText("How does auth work?")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /Auth Flow/i })[0]);

    expect(navigateMock).toHaveBeenCalledWith("/notes?noteId=note-1");

    await userEvent.type(
      screen.getByPlaceholderText("Ask a question about your notes..."),
      "How does JWT refresh work?"
    );
    await userEvent.click(screen.getByRole("button", { name: "Send question" }));

    resolveSecondAnswer({
      data: {
        message: "The provided notes do not contain information about how a JWT refresh flow works.",
        sources: []
      }
    });

    await waitFor(() => {
      expect(
        screen.getByText("The provided notes do not contain information about how a JWT refresh flow works.")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Source notes from Ask answers will appear here.")).toBeInTheDocument();
  });

  it("prefills the input from a dashboard prompt", () => {
    renderAskPage("/ask?prompt=Review%20recent%20notes");

    expect(screen.getByDisplayValue("Review recent notes")).toBeInTheDocument();
  });
});
