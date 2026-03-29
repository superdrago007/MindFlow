import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import HomePage from "../pages/HomePage";

const { logoutMock, showFeedbackMock, getMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  showFeedbackMock: vi.fn(),
  getMock: vi.fn()
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    logout: logoutMock,
    user: {
      username: "alice",
      email: "alice@example.com"
    },
    session: {
      accessToken: "test-token",
      accessTokenExpiresAt: "2027-01-01T00:00:00.000Z"
    }
  })
}));

vi.mock("../context/FeedbackContext", () => ({
  useFeedback: () => ({
    showFeedback: showFeedbackMock
  })
}));

vi.mock("../lib/api", () => ({
  default: {
    get: getMock
  },
  extractApiError: (error: unknown) => (error instanceof Error ? error.message : "Unknown error")
}));

describe("home page recent notes tag visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockImplementation((url: string) => {
      if (url === "/profile") {
        return Promise.resolve({
          data: { username: "alice", email: "alice@example.com", role: "user" }
        });
      }

      if (url === "/profile/metadata") {
        return Promise.resolve({
          data: { Total_Notes: 3, Total_Tags: 6, Total_Connections: 0 }
        });
      }

      if (url === "/profile/notes/recent") {
        return Promise.resolve({
          data: [
            {
              note_id: "note-1",
              title: "API rollout",
              preview: "Preview text",
              time: "Just now",
              tags: [
                { tag_id: "tag-1", name: "release-2026", color: "#112233" },
                { tag_id: "tag-2", name: "qa-pass", color: null }
              ]
            }
          ]
        });
      }

      return Promise.resolve({ data: null });
    });
  });

  it("renders tags for each recent note card", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <HomePage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("API rollout")).toBeInTheDocument();
    });

    expect(screen.getByText("#release-2026")).toBeInTheDocument();
    expect(screen.getByText("#qa-pass")).toBeInTheDocument();
  });
});
