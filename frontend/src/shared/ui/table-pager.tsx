import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Paging (10 rows per table) ─────────────────────────────────── */

export const TABLE_PAGE_SIZE = 10;

/** Slices a list into pages of 10. Falls back to the last page if the list shrinks. */
export function usePaged<T>(items: T[], size = TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  return {
    rows: items.slice((current - 1) * size, current * size),
    page: current,
    pages,
    total: items.length,
    size,
    setPage,
  };
}

/** "Showing 1-10 of 23" with previous / next. Renders nothing when everything fits on one page. */
export function TablePager({
  page,
  pages,
  total,
  size,
  setPage,
}: ReturnType<typeof usePaged>) {
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const arrow =
    "inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        Showing {from}-{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={arrow}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-16 text-center tabular-nums">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className={arrow}
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
