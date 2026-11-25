import { useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "danger" | "muted";

const tones: Record<Tone, string> = {
  default: "text-primary hover:bg-primary/10",
  success: "text-success hover:bg-success/10",
  danger: "text-destructive hover:bg-destructive/10",
  muted: "text-muted-foreground hover:bg-secondary hover:text-foreground",
};

/**
 * One row action: icon + label, a tone, and its own loading state.
 *
 * - If `onClick` returns a promise, the button shows a spinner until it settles.
 * - `loading` forces the spinner from outside (for actions that run inside a confirm dialog).
 * - `disabled` greys it out, e.g. while another action on the same row is running.
 * - `iconOnly` hides the label (the label is still the tooltip and screen-reader name).
 */
export function ActionButton({
  icon: Icon,
  label,
  tone = "default",
  onClick,
  loading = false,
  disabled = false,
  iconOnly = false,
  variant = "ghost",
  title,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: ReactNode;
  tone?: Tone;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  loading?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  /** "outline" gives the button a border, for toolbars; "ghost" is for table rows. */
  variant?: "ghost" | "outline";
  /** Tooltip; defaults to the label for icon-only buttons. Use it to say why a button is disabled. */
  title?: string;
  className?: string;
}) {
  const [running, setRunning] = useState(false);
  const busy = loading || running;
  const text = typeof label === "string" ? label : undefined;

  const handle = async (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || disabled) return;
    const result = onClick(event);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setRunning(true);
      try {
        await result;
      } finally {
        setRunning(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || busy}
      aria-busy={busy}
      aria-label={iconOnly ? text : undefined}
      title={title ?? (iconOnly ? text : undefined)}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" && "h-9 border border-border bg-background px-3",
        iconOnly && "w-8 px-0",
        tones[tone],
        className,
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {iconOnly ? null : label}
    </button>
  );
}
