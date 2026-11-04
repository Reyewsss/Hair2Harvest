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
import { CompostingContent } from "@/features/composting/pages/composting-content.tsx";
import { SuppliersContent } from "@/features/suppliers/pages/suppliers-content.tsx"
import { SupplierProfilePage } from "@/features/suppliers/pages/supplier-profile-page.tsx"

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
      } else if (pathname === "/suppliers") {
    content = <SuppliersContent />;
  } else if (pathname.startsWith("/suppliers/")) {
    // /suppliers/SUP-001
    content = <SupplierProfilePage supplierId={pathname.split("/")[2]} />;
  } else if (pathname === "/machine") {
    content = <MachineContent />;
  } else if (pathname === "/composting") {
    content = <CompostingContent />;
  } else if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    // /reports/collection, /reports/equipment, ... (a bare /reports shows the first category)
    content = <ReportsContent category={pathname.split("/")[2]} />;
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
