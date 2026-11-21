import type { ReactNode } from "react";
import { format, isValid, parse } from "date-fns";
import { Inbox, type LucideIcon } from "lucide-react";
import { TableCell, TableRow } from "@/shared/ui/table";
import { cn } from "@/lib/utils";

/* ─── Formatters ─────────────────────────────────────────────────── */

export function formatPickupDate(value?: string, pattern = "EEE, MMM d, yyyy") {
  if (!value) return "—";
  const d = parse(value.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, pattern) : value;
}

export function formatPickupTime(value?: string) {
  if (!value) return "—";
  const d = parse(value, "HH:mm", new Date());
  return isValid(d) ? format(d, "h:mm a") : value;
}

export function initials(name?: string) {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/* ─── Status badge ───────────────────────────────────────────────── */

const statusTone: Record<string, { badge: string; dot: string }> = {
  scheduled: {
    badge: "bg-secondary text-secondary-foreground",
    dot: "bg-muted-foreground/60",
  },
  collected: { badge: "bg-primary/10 text-primary", dot: "bg-primary" },
  delivered: { badge: "bg-success/10 text-success", dot: "bg-success" },
  missed: {
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  cancelled: {
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

export function PickupStatusBadge({ status }: { status?: string }) {
  const tone = statusTone[status ?? ""] ?? statusTone.scheduled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tone.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {status ?? "unknown"}
    </span>
  );
}

/* ─── Progress steps: Scheduled → Collected → Delivered ──────────── */

const STEPS = ["scheduled", "collected", "delivered"] as const;

export function PickupProgress({ status }: { status?: string }) {
  const current = Math.max(0, STEPS.indexOf(status as (typeof STEPS)[number]));
  return (
    <div className="flex items-center gap-1" aria-label={`Progress: ${status}`}>
      {STEPS.map((step, i) => (
        <span
          key={step}
          title={step}
          className={cn(
            "h-1.5 w-6 rounded-full",
            i <= current
              ? i === 2
                ? "bg-success"
                : "bg-primary"
              : "bg-secondary",
          )}
        />
      ))}
    </div>
  );
}

/* ─── Staff cell with avatar ─────────────────────────────────────── */

export function PersonCell({ name }: { name?: string }) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-full border border-dashed text-xs">
          ?
        </span>
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const iconTone = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <article className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          iconTone,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </p>
        {note ? (
          <p className="truncate text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ─── Section card ───────────────────────────────────────────────── */

export function SectionCard({
  icon: Icon,
  title,
  description,
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border">
            <Icon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

/* ─── Table states ───────────────────────────────────────────────── */

export function TableEmpty({
  colSpan,
  title,
  description,
  icon: Icon = Inbox,
}: {
  colSpan: number;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        // `!` because dashboard.css zeroes padding-block on every table cell.
        className="px-6! py-12! text-center whitespace-normal"
      >
        <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-secondary">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <p className="w-full text-center font-medium">{title}</p>
          {description ? (
            <p className="-mt-1 w-full text-center text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TableSkeleton({
  colSpan,
  rows = 3,
}: {
  colSpan: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: colSpan }).map((_, c) => (
            <TableCell key={c}>
              <div className="h-4 w-full max-w-28 animate-pulse rounded bg-secondary" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
