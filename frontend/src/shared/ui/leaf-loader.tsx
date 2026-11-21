import { cn } from "@/lib/utils";

/* Leaf loading indicator: a leaf swaying on its stem over a soft shadow, in the dashboard
 * olive, with an optional label whose trailing dots type themselves out.
 *
 *   <LeafLoader label="Loading suppliers" />            // inline (tables, menus)
 *   <LeafLoader label="Loading profile" page />         // centred block for a whole page
 *
 * Animations live in dashboard.css (.h2h-leaf*). */

const SIZES = { sm: 18, md: 30, lg: 44 } as const;

export function LeafLoader({
  label,
  size = "md",
  page = false,
  className,
}: {
  label?: string;
  size?: keyof typeof SIZES;
  /** Centre it in a tall block, for a page that's still loading. */
  page?: boolean;
  className?: string;
}) {
  const px = SIZES[size];
  const inline = size === "sm";

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "text-muted-foreground",
        inline ? "inline-flex items-center gap-2" : "flex flex-col items-center justify-center gap-3",
        // Fills the content panel (dashboard-layout makes .h2h-page a flex column), so the
        // leaf sits in its centre; min-h covers loaders placed under a page header.
        page && "min-h-[50vh] w-full flex-1",
        className,
      )}
    >
      <span className="relative inline-flex" style={{ width: px, height: px }} aria-hidden>
        <svg viewBox="0 0 32 32" width={px} height={px} className="h2h-leaf text-primary">
          {/* blade */}
          <path
            d="M6 27C5 17 10 7 27 5c-1 16-9 23-21 22Z"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* midrib + stem, drawn in a loop */}
          <path
            className="h2h-leaf-vein"
            d="M4 29 L8 25 C12 21 17 15 21 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {!inline ? <span className="h2h-leaf-shadow" /> : null}
      </span>
      {label ? (
        <span className={cn(inline ? "text-sm" : "text-sm font-medium")}>
          {label}
          <span className="h2h-dots" aria-hidden />
        </span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}
