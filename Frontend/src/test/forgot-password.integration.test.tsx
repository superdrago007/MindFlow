import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { clearTokens } from "../lib/tokenStore";

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

function renderAppWithEntries(initialEntries: Array<string | { pathname: string; search?: string; state?: unknown }>) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("forgot password integration", () => {
  beforeEach(() => {
    clearTokens();
    window.localStorage.clear();
    window.sessionStorage.clear();
    postMock.mockReset();
    getMock.mockReset();
  });

  it("navigates from login to verify email page", async () => {
    renderApp("/login");

    await userEvent.click(screen.getByRole("link", { name: "Forgot password?" }));

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeInTheDocument();
    });
  });

  it("shows wrong OTP feedback in OTP page", async () => {
    postMock
      .mockResolvedValueOnce({ data: { message: "If the email is registered, an OTP has been sent." } })
      .mockResolvedValueOnce({ data: { message: "If the email is registered, an OTP has been sent.", resend_after_seconds: 60 } })
      .mockRejectedValueOnce(new Error("Wrong OTP"));

    renderApp("/verifyEmail");

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Enter OTP")).toBeInTheDocument();
    });

    for (let index = 1; index <= 6; index += 1) {
      await userEvent.type(screen.getByLabelText(`OTP digit ${index}`), String(index));
    }

    await userEvent.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(screen.getByText("Wrong OTP")).toBeInTheDocument();
    });
  });

  it("locks OTP entry when backend returns lock metadata", async () => {
    postMock
      .mockResolvedValueOnce({ data: { message: "If the email is registered, an OTP has been sent." } })
      .mockResolvedValueOnce({
        data: {
          message: "If the email is registered, an OTP has been sent.",
          resend_after_seconds: 60,
          is_locked: false,
          lock_remaining_seconds: null
        }
      })
      .mockRejectedValueOnce({
        response: {
          status: 429,
          data: {
            detail: {
              message: "Too many failed attempts. Try again later.",
              is_locked: true,
              lock_remaining_seconds: 300
            }
          }
        }
      });

    renderApp("/verifyEmail");

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Enter OTP")).toBeInTheDocument();
    });

    for (let index = 1; index <= 6; index += 1) {
      await userEvent.type(screen.getByLabelText(`OTP digit ${index}`), String(index));
    }

    await userEvent.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(screen.getByText("Too many failed attempts. Try again later.")).toBeInTheDocument();
    });

    expect(screen.getByText("Try again in 5m 00s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify OTP" })).toBeDisabled();
    expect(screen.getByLabelText("OTP digit 1")).toBeDisabled();
  });

  it("redirects to login when otp page is hard reloaded", async () => {
    const originalGetEntriesByType = window.performance.getEntriesByType.bind(window.performance);
    const navigationSpy = vi.spyOn(window.performance, "getEntriesByType").mockImplementation((entryType: string) => {
      if (entryType === "navigation") {
        return [{ type: "reload" } as unknown as PerformanceEntry];
      }
      return originalGetEntriesByType(entryType);
    });

    try {
      renderAppWithEntries([
        {
          pathname: "/otp",
          search: `?email=${encodeURIComponent("timer@example.com")}`,
          state: { resendAfter: 60, initialLockRemaining: 0 }
        }
      ]);

      await waitFor(() => {
        expect(screen.getByText("Welcome back")).toBeInTheDocument();
      });
    } finally {
      navigationSpy.mockRestore();
    }
  });

  it("redirects to login when verify email page is hard reloaded", async () => {
    const originalGetEntriesByType = window.performance.getEntriesByType.bind(window.performance);
    const navigationSpy = vi.spyOn(window.performance, "getEntriesByType").mockImplementation((entryType: string) => {
      if (entryType === "navigation") {
        return [{ type: "reload" } as unknown as PerformanceEntry];
      }
      return originalGetEntriesByType(entryType);
    });

    try {
      renderApp("/verifyEmail");

      await waitFor(() => {
        expect(screen.getByText("Welcome back")).toBeInTheDocument();
      });
    } finally {
      navigationSpy.mockRestore();
    }
  });

  it("still allows navigating from login to verify email after a hard-reload session", async () => {
    const originalGetEntriesByType = window.performance.getEntriesByType.bind(window.performance);
    const navigationSpy = vi.spyOn(window.performance, "getEntriesByType").mockImplementation((entryType: string) => {
      if (entryType === "navigation") {
        return [{ type: "reload" } as unknown as PerformanceEntry];
      }
      return originalGetEntriesByType(entryType);
    });

    try {
      renderApp("/login");

      await userEvent.click(screen.getByRole("link", { name: "Forgot password?" }));

      await waitFor(() => {
        expect(screen.getByText("Verify your email")).toBeInTheDocument();
      });
    } finally {
      navigationSpy.mockRestore();
    }
  });
});
