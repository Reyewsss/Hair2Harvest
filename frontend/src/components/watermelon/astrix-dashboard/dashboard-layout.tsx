import type { CSSProperties, ReactNode } from "react";
import { DashboardSidebar } from "./components/astrix/sidebar";
import { DashboardTopbar } from "./components/astrix/topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./dashboard.css";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-svh w-screen overflow-hidden bg-muted/30">
      <SidebarProvider
        className="astrix-dashboard h-[111.11svh] w-[111.11vw] overflow-hidden no-scrollbar scale-90 origin-top-left"
        style={
          {
            "--sidebar-width": "18.125rem",
            "--sidebar-width-icon": "5.125rem",
          } as CSSProperties
        }
      >
        <DashboardSidebar />

        {/* Main content area pulled away from the edges to match the floating sidebar */}
        <main className="flex flex-1 flex-col overflow-hidden ml-6 p-3 pl-0">
          {/* Floating Topbar */}
          <div className="sticky top-0 z-50 w-full bg-sidebar rounded-xl border border-border/50 shadow-sm mb-3">
            <DashboardTopbar />
          </div>

          {/* Floating Content Area */}
          <div className="flex-1 overflow-y-auto bg-background rounded-xl border border-border/50 shadow-sm p-4">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
