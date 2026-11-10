import { ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DashboardLink } from "@/features/dashboard-shell/components/navigation";

export function AccessDenied() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 pt-24 pb-10 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="size-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-muted-foreground">
        You don't have permission to view this page. If you think this is a
        mistake, contact your administrator.
      </p>
      <Button render={<DashboardLink href="/" />} nativeButton={false}>
        Back to dashboard
      </Button>
    </div>
  );
}
