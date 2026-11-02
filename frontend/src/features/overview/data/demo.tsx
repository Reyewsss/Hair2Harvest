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

function DashboardRoute() {
  const { pathname } = useDashboardNavigation();

  let content: ReactNode = <DashboardContent />;

  if (pathname === "/accounts") {
    content = <AccountManagementContent />;
  } else if (pathname === "/inventory") {
    content = <InventoryContent />;
  } else if (pathname.startsWith("/inventory/")) {
    // /inventory/schedule, /inventory/tracking, /inventory/stock, ...
    content = <InventoryViewPage tab={pathname.split("/")[2]} />;
  } else if (pathname === "/machine") {
    content = <ReportsContent />;
  } else if (pathname === "/composting") {
    content = <ReportsContent />;
  } else if (pathname === "/reports") {
    content = <ReportsContent />;
  }

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
