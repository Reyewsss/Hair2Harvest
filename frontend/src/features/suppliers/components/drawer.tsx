import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button.tsx";

// Slide-in side drawer.
//
// Two things keep the slide animation from disturbing the page:
//  1. It renders into document.body (a portal). Inside the dashboard layout, "fixed" is measured from the nearest
//     ancestor that has a transform or filter, not from the window, so the panel was sized and shifted by that
//     ancestor and its off-screen starting position stretched the layout.
//  2. The overlay uses overflow-clip. A hidden-overflow box can still be scrolled by the browser when an input
//     inside it is focused (autoFocus on an off-screen panel scrolled the whole page sideways). Clip can't be scrolled.
export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Mount first (panel sits off-screen), then switch to the visible state on the next tick so it animates.
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
    // Slide out, then remove after the transition ends.
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    // "astrix-dashboard contents" gives the portaled drawer the dashboard's theme colors (and dark mode)
    // without adding a box of its own.
    <div className="astrix-dashboard contents">
      <div
        className="fixed inset-0 z-50 flex justify-end overflow-clip"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className={`relative flex h-full w-full max-w-lg flex-col border-l bg-background shadow-xl transition-transform duration-300 ease-in-out will-change-transform motion-reduce:transition-none ${
            visible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Close" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}