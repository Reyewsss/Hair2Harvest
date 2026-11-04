import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button.tsx"; 

// Side drawer. It only renders its children while open, so every open starts with a fresh form.
// Children should render their own scroll area and footer (see supplier-form.tsx).
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l bg-background shadow-xl">
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
  );
}