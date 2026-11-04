// App.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router";
import LoginPage from "../features/auth/pages/login-page.tsx";
import AstrixDashboardDemo from "../features/overview/data/demo.tsx";
import VerifyOtpPage from "@/features/auth/pages/verify-otp-page.tsx";
import ForgotPasswordPage from "@/features/auth/pages/forgot-password-page.tsx";
import ResetPasswordPage from "@/features/auth/pages/reset-password-page.tsx";
import { api } from "@/shared/lib/api";

/** Blocks the dashboard until the session cookie is confirmed by the API. */
function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let active = true;
    api
      .get("/api/auth/check-auth")
      .then(() => active && setState("ok"))
      .catch(() => active && setState("denied"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (state === "denied") return <Navigate to="/login" replace />;

  return <>{children}</>;
}

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <AstrixDashboardDemo />
          </RequireAuth>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
};

export default App;
