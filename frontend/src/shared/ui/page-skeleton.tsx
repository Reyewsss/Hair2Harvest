import { Skeleton } from "@/shared/ui/skeleton";
import { TableCell, TableRow } from "@/shared/ui/table";
import { cn } from "@/lib/utils";

/* Loading placeholders that match the shape of what is loading, so the page doesn't jump.
 *
 *   <PageSkeleton variant="table" />      // title, filter bar, table (lists)
 *   <PageSkeleton variant="cards" />      // title, stat cards, table (overviews)
 *   <PageSkeleton variant="form" />       // title and stacked setting rows
 *   <PageSkeleton variant="profile" />    // identity card plus detail cards
 *   <TableRowsSkeleton colSpan={5} />     // rows inside an existing <TableBody>
 *   <ListSkeleton rows={4} />             // a short list inside a card
 */

export function TableRowsSkeleton({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent" aria-hidden>
          {Array.from({ length: colSpan }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className={cn("h-4", c === 0 ? "w-3/4" : "w-full max-w-28")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableBlock({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-hidden>
      <div className="flex gap-4 border-b bg-secondary/40 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b px-5 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-40")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  variant = "table",
  className,
}: {
  variant?: "table" | "cards" | "form" | "profile";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6", className)}
    >
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : null}

      {variant === "table" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 w-full rounded-lg md:max-w-sm" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
      ) : null}

      {variant === "form" ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}

      {variant === "profile" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : null}

      {variant === "table" || variant === "cards" ? <TableBlock /> : null}
    </div>
  );
}
