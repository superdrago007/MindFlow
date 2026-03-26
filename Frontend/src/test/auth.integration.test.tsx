import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { clearTokens, getTokens, tokenStoreSessionKey } from "../lib/tokenStore";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn()
}));

vi.mock("../lib/api", () => ({
  default: {
    post: postMock,
    get: getMock
  },
  configureAuthHandlers: vi.fn(),
  extractApiError: (error: unknown) => {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    return "Something went wrong. Please try again.";
  }
}));

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

const loginResponse = {
  username: "alice",
  email: "alice@example.com",
  role: "user",
  profile_pic: null,
  access_token: "access-token",
  refresh_token: "refresh-token",
  access_token_expires_in: 1800,
  refresh_token_expires_in: 604800
};

const signupResponse = {
  username: "newuser",
  role: "user",
  full_name: "New User",
  email: "new@example.com",
  is_active: true,
  profile_pic: null,
  access_token: "access-token-2",
  refresh_token: "refresh-token-2",
  access_token_expires_in: 1800,
  refresh_token_expires_in: 604800
};

describe("auth integration", () => {
  beforeEach(() => {
    clearTokens();
    window.localStorage.clear();
    window.sessionStorage.clear();
    postMock.mockReset();
    getMock.mockReset();
    getMock.mockResolvedValue({ data: { username: "alice", email: "alice@example.com", role: "user" } });
  });

  it("stores session in memory and redirects on login success", async () => {
    postMock.mockResolvedValueOnce({ data: loginResponse });

    renderApp("/login");

    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();
    });

    expect(getTokens()?.accessToken).toBe("access-token");
    expect(window.localStorage.getItem(tokenStoreSessionKey())).toBeNull();
  });

  it("stores session in sessionStorage when remember me is checked", async () => {
    postMock.mockResolvedValueOnce({ data: signupResponse });

    renderApp("/signup");

    await userEvent.type(screen.getByLabelText("Full name"), "New User");
    await userEvent.type(screen.getByLabelText("Username"), "newuser");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByLabelText("Remember me for this browser session"));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();
    });

    expect(window.sessionStorage.getItem(tokenStoreSessionKey())).toContain("access-token-2");
    expect(window.localStorage.getItem(tokenStoreSessionKey())).toBeNull();
  });

  it("shows backend detail on login failure", async () => {
    postMock.mockRejectedValueOnce(new Error("Invalid username or password"));

    renderApp("/login");

    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated user from protected route", async () => {
    renderApp("/");

    await waitFor(() => {
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });
  });

  it("clears expired remember-me session at startup", async () => {
    window.sessionStorage.setItem(
      tokenStoreSessionKey(),
      JSON.stringify({
        accessToken: "expired-access",
        refreshToken: "expired-refresh",
        accessTokenExpiresAt: "2000-01-01T00:00:00.000Z",
        refreshTokenExpiresAt: "2000-01-08T00:00:00.000Z",
        user: {
          username: "expired",
          email: "expired@example.com",
          role: "user",
          fullName: null,
          isActive: true,
          profilePic: null
        }
      })
    );

    renderApp("/");

    await waitFor(() => {
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });

    expect(window.sessionStorage.getItem(tokenStoreSessionKey())).toBeNull();
  });
});
