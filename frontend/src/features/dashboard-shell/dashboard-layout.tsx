import { useEffect, type CSSProperties, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react"; // 👈 Changed to ShieldCheck
import { DashboardSidebar } from "./components/sidebar";
import { DashboardTopbar } from "./components/topbar";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { useAuth } from "@/features/auth/context/auth-context";
import { openModal, closeModal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import "./dashboard.css";

type DashboardLayoutProps = {
  children: ReactNode;
};

const WELCOME_KEY = "welcome-shown-admin";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // 1. Wait until the session is fully restored
    if (loading) return;

    // 2. Only for signed-in admins
    if (!user || user.role !== "admin") return;

    // 3. Only skip if the modal was *actually dismissed* before
    if (sessionStorage.getItem(WELCOME_KEY)) return;

    // 4. Open the modal immediately (ModalHost is mounted at the app root)
    openModal({
      size: "md",
      closeOnOverlayClick: false, // force them to click "Let's go"
      content: (
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* 👇 Admin Icon Badge */}
          <div className="rounded-full bg-primary/10 p-4 ring-4 ring-primary/5">
            <ShieldCheck className="size-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Welcome back, {user.name.split(" ")[0]}!
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              You're signed in as an administrator. From here you can manage
              suppliers, monitor composting batches, and keep an eye on today's
              pickups.
            </p>
          </div>

          <Button
            type="button"
            className="mt-2 h-10 px-6"
            onClick={() => {
              // 👇 Only mark as shown when the user dismisses the modal
              sessionStorage.setItem(WELCOME_KEY, "1");
              closeModal();
            }}
          >
            Let's go
          </Button>
        </div>
      ),
    });
  }, [user, loading]);

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
