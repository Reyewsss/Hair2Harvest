import type { ReactNode } from "react";
import { DashboardLink } from "@/features/dashboard-shell/components/navigation";
import { useAuth } from "./context/auth-context";
import { can, type Permission } from "./permissions";

/** True when the signed-in user may do this. Use it to hide or disable buttons. */
export function useCan(permission: Permission) {
  const { user } = useAuth();
  return user ? can(user.role, permission) : false;
}

/** Renders its children only when the user has the permission. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>;
}

export function AccessDenied() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">
        You don't have access to this page
      </h1>
      <p className="text-muted-foreground">
        Your role doesn't include this area. If you think that's a mistake, ask
        an administrator.
      </p>
      <DashboardLink
        href="/"
        className="font-medium text-primary hover:underline"
      >
        Back to the dashboard
      </DashboardLink>
    </div>
  );
}
