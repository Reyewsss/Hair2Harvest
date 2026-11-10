import type { ReactNode } from "react";
import DashboardLayout from "../../dashboard-shell/dashboard-layout";
import { AccountManagementContent } from "../../accounts/accounts-content";
import { DashboardContent } from "../dashboard-content";
import {
  DashboardNavigationProvider,
  useDashboardNavigation,
} from "../../dashboard-shell/components/navigation";
import { ReportsContent } from "../../reports/reports-content";
import { ThemeProvider } from "../../dashboard-shell/components/theme-provider";
import { InventoryContent } from "@/features/inventory/pages/inventory-content";
import { InventoryViewPage } from "@/features/inventory/pages/inventory-view-page";
import { MachineContent } from "@/features/machine/pages/machine-content.tsx";
import { CompostingContent } from "@/features/composting/pages/composting-content";
import { SuppliersContent } from "@/features/suppliers/pages/suppliers-content.tsx";
import { SupplierProfilePage } from "@/features/suppliers/pages/supplier-profile-page.tsx";
import { useAuth } from "@/features/auth/context/auth-context";

import { PickupScheduleView } from "@/features/suppliers/pages/pickup-schedule-view";
import { PickupTrackingView } from "@/features/suppliers/pages/pickup-tracking-view";

// 👇 These two imports fix the error
import { canAccessPath } from "@/features/auth/permissions";
import { AccessDenied } from "@/features/auth/access-denied";

function DashboardRoute() {
  const { pathname } = useDashboardNavigation();
  const { user } = useAuth();

  let content: ReactNode = <DashboardContent />;

  if (pathname === "/accounts") {
    content = <AccountManagementContent />;
  } else if (pathname === "/inventory") {
    content = <InventoryContent />;
  } else if (pathname.startsWith("/inventory/")) {
    content = <InventoryViewPage tab={pathname.split("/")[2]} />;
  } else if (pathname === "/suppliers") {
    content = <SuppliersContent />;
  } else if (pathname === "/suppliers/schedule") {
    content = <PickupScheduleView />;
  } else if (pathname === "/suppliers/tracking") {
    content = <PickupTrackingView />;
  } else if (pathname.startsWith("/suppliers/")) {
    content = <SupplierProfilePage supplierId={pathname.split("/")[2]} />;
  } else if (pathname === "/machine") {
    content = <MachineContent />;
  } else if (pathname === "/composting") {
    content = <CompostingContent />;
  } else if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    content = <ReportsContent category={pathname.split("/")[2]} />;
  }

  // Role check. The server enforces the same rules on every API call.
  if (user && !canAccessPath(user.role, pathname)) content = <AccessDenied />;

  return <DashboardLayout>{content}</DashboardLayout>;
}

export default function AstrixDashboardDemo() {
  return (
    <ThemeProvider>
      <DashboardNavigationProvider>
        <DashboardRoute />
      </DashboardNavigationProvider>
    </ThemeProvider>
  );
}
