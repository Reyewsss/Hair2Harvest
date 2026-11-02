import type { ReactNode } from "react";
import DashboardLayout from "../../dashboard-shell/dashboard-layout";
import { AccountManagementContent } from "../../accounts/components/accounts-content";
import { DashboardContent } from "../components/dashboard-content";
import {
  DashboardNavigationProvider,
  useDashboardNavigation,
} from "../../dashboard-shell/components/navigation";
import { ReportsContent } from "../../reports/components/reports-content";
import { ThemeProvider } from "../../dashboard-shell/components/theme-provider";

function DashboardRoute() {
  const { pathname } = useDashboardNavigation();

  let content: ReactNode = <DashboardContent />;

  if (pathname === "/classification") {
    content = <AccountManagementContent />;
  } else if (pathname === "/reports") {
    content = <ReportsContent />;
  } else if (
    pathname === "/integration" ||
    pathname === "/compliance" ||
    pathname === "/settings"
  ) {
    content = null;
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
