import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/auth-context.tsx";

const Checking = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
    Loading...
  </div>
);

/** Wrap the dashboard routes. Not signed in -> /login. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Checking />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Wrap /login, /forgot-password, /verify-otp and /reset-password. Already signed in -> /dashboard. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Checking />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
