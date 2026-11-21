import type { ReactNode } from "react";
import { Sprout } from "lucide-react";

/* 404 page in the dashboard palette (olive / cream, see dashboard.css).
 * Used inside the dashboard layout for unknown or unavailable sections, and full-screen
 * (wrapped in .astrix-dashboard for the palette) for unknown top-level URLs.
 */
export function NotFound({
  path,
  action,
  title = "Page not found",
  message = "The page you're looking for doesn't exist, has moved, or hasn't been planted yet.",
}: {
  /** Shown under the heading so the user can see what they tried to open. */
  path?: string;
  /** The "go back" button; differs inside and outside the dashboard. */
  action: ReactNode;
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 pt-20 pb-12 text-center md:pt-28">
      <div
        aria-hidden
        className="flex items-center gap-2 text-[6.5rem] leading-none font-bold tracking-tight text-primary select-none md:text-[8rem]"
      >
        <span>4</span>
        <span className="relative flex size-[5.5rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:size-[6.75rem]">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2.5s]" />
          <Sprout className="relative size-11 md:size-14" strokeWidth={1.75} />
        </span>
        <span>4</span>
      </div>

      <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{message}</p>

      {path ? (
        <code className="mt-4 max-w-full truncate rounded-md border bg-secondary px-2.5 py-1 font-mono text-sm text-foreground">
          {path}
        </code>
      ) : null}

      <div className="mt-8">{action}</div>
    </div>
  );
}
