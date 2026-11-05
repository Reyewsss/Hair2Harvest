// App.tsx
import { Routes, Route, Navigate } from "react-router";
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

const App = () => {
  return (
    <AuthProvider>
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
      </Routes>
    </AuthProvider>
  );
};

export default App;
