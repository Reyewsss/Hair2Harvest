import type { ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  AlertTriangle,
  CheckCircle2,
  CopyX,
  Info,
  PencilLine,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { closeModal, openModal } from "@/shared/ui/modal";
import { cn } from "@/lib/utils";

/* Global result modal — call from anywhere:
 *
 *   showResult({ type: "success", title: "Pickup scheduled", message: "..." })
 *   showResult({ type: "exists",  title: "Already scheduled", message: "..." })
 *
 * Types: success | created | updated | deleted | exists | warning | error | info
 */

export type ResultType =
  | "success"
  | "created"
  | "updated"
  | "deleted"
  | "archived"
  | "restored"
  | "exists"
  | "warning"
  | "error"
  | "info";

const resultStyles: Record<
  ResultType,
  { icon: LucideIcon; ring: string; fallbackTitle: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "bg-success/10 text-success",
    fallbackTitle: "Success",
  },
  created: {
    icon: CheckCircle2,
    ring: "bg-success/10 text-success",
    fallbackTitle: "Created",
  },
  updated: {
    icon: PencilLine,
    ring: "bg-primary/10 text-primary",
    fallbackTitle: "Changes saved",
  },
  deleted: {
    icon: Trash2,
    ring: "bg-destructive/10 text-destructive",
    fallbackTitle: "Deleted",
  },
  archived: {
    icon: Archive,
    ring: "bg-secondary text-foreground",
    fallbackTitle: "Archived",
  },
  restored: {
    icon: ArchiveRestore,
    ring: "bg-success/10 text-success",
    fallbackTitle: "Restored",
  },
  exists: {
    icon: CopyX,
    ring: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    fallbackTitle: "Already exists",
  },
  warning: {
    icon: AlertTriangle,
    ring: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    fallbackTitle: "Heads up",
  },
  error: {
    icon: XCircle,
    ring: "bg-destructive/10 text-destructive",
    fallbackTitle: "Something went wrong",
  },
  info: {
    icon: Info,
    ring: "bg-secondary text-foreground",
    fallbackTitle: "Notice",
  },
};

export type ShowResultOptions = {
  type: ResultType;
  title?: string;
  message?: ReactNode;
  /** Extra lines shown in a muted box, e.g. the pickup's shop / date / time. */
  details?: { label: string; value: ReactNode }[];
  confirmLabel?: string;
  onClose?: () => void;
};

function ResultContent({
  type,
  title,
  message,
  details,
  confirmLabel = "OK",
  onClose,
}: ShowResultOptions) {
  const style = resultStyles[type];
  const Icon = style.icon;

  const handleClose = () => {
    closeModal();
    onClose?.();
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-2 text-center">
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          style.ring,
        )}
      >
        <Icon className="size-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">
          {title ?? style.fallbackTitle}
        </h3>
        {message ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>

      {details && details.length > 0 ? (
        <dl className="w-full space-y-2 rounded-lg bg-secondary/60 px-4 py-3 text-left text-sm">
          {details.map((d) => (
            <div
              key={d.label}
              className="flex items-start justify-between gap-4"
            >
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="text-right font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Button
        type="button"
        autoFocus
        onClick={handleClose}
        variant={type === "error" || type === "deleted" ? "outline" : "default"}
        className="mt-1 h-10 w-full sm:w-40"
      >
        {confirmLabel}
      </Button>
    </div>
  );
}

export function showResult(options: ShowResultOptions) {
  openModal({
    // Heading lives inside the content (under the icon), so the modal header stays empty.
    title: "",
    size: "md",
    content: <ResultContent {...options} />,
  });
}

/** True when an API error means "this record already exists" (409 / Mongo E11000). */
export function isDuplicateError(err: unknown): boolean {
  const e = err as { status?: number; code?: number; message?: string } | null;
  if (!e) return false;
  if (e.status === 409 || e.code === 11000) return true;
  return /already exists|duplicate|E11000|409/i.test(e.message ?? "");
}
