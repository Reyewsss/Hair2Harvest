import { useCallback, useEffect, useRef, useState } from "react";
import { auditApi, type AuditEntry } from "@/features/audit/audit-api";

export type { AuditEntry };

const LAST_SEEN_KEY = "audit-notifications:last-seen";
const POLL_INTERVAL_MS = 30_000;

function readLastSeen(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(value: number) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(value));
  } catch {
    /* storage unavailable — unread state just won't persist */
  }
}

export function useAuditNotifications(limit = 8) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(readLastSeen);

  const requestIdRef = useRef(0);

  const fetchEntries = useCallback(async () => {
    // Ignore responses from older requests if a newer one has started.
    const requestId = ++requestIdRef.current;

    try {
      // Same client the Audit Trail table uses, so auth and base URL match.
      const res = await auditApi.list({ limit });
      if (requestId !== requestIdRef.current) return;
      setEntries(Array.isArray(res.entries) ? res.entries : []);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = (err as Error)?.message || "Couldn't load notifications";
      console.warn("[audit notifications]", message);
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEntries();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchEntries();
    }, POLL_INTERVAL_MS);

    const onFocus = () => fetchEntries();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchEntries]);

  const unreadCount = entries.filter(
    (e) => new Date(e.createdAt).getTime() > lastSeen,
  ).length;

  const markAllSeen = useCallback(() => {
    const newest = entries[0] ? new Date(entries[0].createdAt).getTime() : 0;
    const value = Math.max(newest, Date.now());
    writeLastSeen(value);
    setLastSeen(value);
  }, [entries]);

  return {
    entries,
    isLoading,
    error,
    unreadCount,
    lastSeen,
    markAllSeen,
    refresh: fetchEntries,
  };
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Scrolls only the nearest scrollable container (e.g. the dashboard content
 * pane). Unlike element.scrollIntoView(), this never shifts overflow-hidden
 * ancestors, so the topbar and sidebar stay put. */
function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null; // page itself scrolls
}

export function scrollToElementById(id: string, offset = 16): boolean {
  const el = document.getElementById(id);
  if (!el) return false;

  const container = getScrollParent(el);
  if (container) {
    const top =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      offset;
    container.scrollTo({ top, behavior: "smooth" });
  } else {
    // Page-level scrolling: account for a sticky topbar (h-16 = 64px).
    const top = el.getBoundingClientRect().top + window.scrollY - 64 - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
  return true;
}
