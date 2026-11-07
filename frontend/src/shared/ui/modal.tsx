import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";

/* --------------------------------------------------------------
   Types
   -------------------------------------------------------------- */

export type ModalOptions = {
  title?: string;
  description?: string;
  content: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
};

type Snapshot = { isOpen: boolean; options: ModalOptions | null };

/* --------------------------------------------------------------
   Store — cached snapshot (fixes infinite loop)
   -------------------------------------------------------------- */

let isOpen = false;
let currentOptions: ModalOptions | null = null;
let snapshot: Snapshot = { isOpen: false, options: null };

const listeners = new Set<() => void>();

const notify = () => {
  snapshot = { isOpen, options: currentOptions };
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

/* --------------------------------------------------------------
   Public API
   -------------------------------------------------------------- */

export function openModal(options: ModalOptions) {
  currentOptions = options;
  isOpen = true;
  notify();
}

export function closeModal() {
  const opts = currentOptions;
  isOpen = false;
  notify();
  opts?.onClose?.();
  setTimeout(() => {
    currentOptions = null;
    notify();
  }, 200);
}

export function confirm(opts: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const isDestructive = opts.variant === "destructive";

  openModal({
    size: "sm",
    // 👇 Remove the default title/description padding so the custom layout is truly centered
    content: (
      <div className="flex flex-col items-center text-center space-y-4 pt-2">
        {isDestructive ? (
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{opts.title}</h2>
          {opts.description ? (
            <p className="text-sm text-muted-foreground">{opts.description}</p>
          ) : null}
        </div>

        <div className="flex w-full justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              opts.onCancel?.();
              closeModal();
            }}
          >
            {opts.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            className="h-10"
            onClick={async () => {
              await opts.onConfirm();
              closeModal();
            }}
          >
            {opts.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    ),
  });
}

/* --------------------------------------------------------------
   ModalHost — mount once at app root
   -------------------------------------------------------------- */

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function ModalHost() {
  const { isOpen, options } = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (!isOpen || !options) return null;

  const closeOnOverlay = options.closeOnOverlayClick ?? true;
  const showClose = options.showCloseButton ?? true;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className={`relative w-full ${sizeClasses[options.size ?? "md"]} max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl`}
      >
        {showClose && (
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        )}

        {(options.title || options.description) && (
          <div className="mb-4 pr-8">
            {options.title ? (
              <h2 className="text-lg font-semibold">{options.title}</h2>
            ) : null}
            {options.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {options.description}
              </p>
            ) : null}
          </div>
        )}

        {options.content}
      </div>
    </div>
  );
}
