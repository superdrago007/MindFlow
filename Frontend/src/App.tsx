import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import AskPage from "./pages/AskPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotesPage from "./pages/NotesPage";
import OtpPage from "./pages/OtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="aurora-bg grid min-h-screen place-items-center px-6 text-[var(--text-secondary)]">
        <p className="glass-panel rounded-2xl px-6 py-3 font-body text-sm uppercase tracking-[0.18em]">Loading session</p>
      </div>
    );
  }

  return (
    <FeedbackProvider>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verifyEmail" element={<VerifyEmailPage />} />
          <Route path="/otp" element={<OtpPage />} />
          <Route path="/resetPassword" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/ask" element={<AskPage />} />
          <Route path="/notes" element={<NotesPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </FeedbackProvider>
  );
}

export default App;
