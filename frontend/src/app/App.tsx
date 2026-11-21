// App.tsx
import { Routes, Route, Navigate, Link, useLocation } from "react-router";
import LoginPage from "../features/auth/pages/login-page.tsx";
import AstrixDashboardDemo from "../features/overview/data/demo.tsx";
import VerifyOtpPage from "@/features/auth/pages/verify-otp-page.tsx";
import ForgotPasswordPage from "@/features/auth/pages/forgot-password-page.tsx";
import ResetPasswordPage from "@/features/auth/pages/reset-password-page.tsx";
import { AuthProvider } from "@/features/auth/context/auth-context.tsx";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/features/auth/routes/route-guards";
import { ModalHost } from "@/shared/ui/modal.tsx";
import { Toaster } from "@/shared/ui/toaster.tsx";
import { NotFound } from "@/shared/ui/not-found.tsx";
import { Button } from "@/shared/ui/button";

// Unknown top-level URL. .astrix-dashboard gives it the dashboard palette outside the layout;
// "/" sends signed-in users to the dashboard and everyone else to the login page.
function NotFoundScreen() {
  const { pathname } = useLocation();
  return (
    <main className="astrix-dashboard min-h-screen">
      <NotFound
        path={pathname}
        action={
          <Button render={<Link to="/" />} nativeButton={false} className="h-10 px-5">
            Go to home
          </Button>
        }
      />
    </main>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <ModalHost />
      <Toaster />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<AstrixDashboardDemo />} />
        </Route>
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
