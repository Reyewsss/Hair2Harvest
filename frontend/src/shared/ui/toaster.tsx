import { Toaster as Sonner } from "sonner";

/* Global toast host, mounted once in App.tsx. Fire toasts from anywhere with a
 * single short sentence:
 *
 *   import { toast } from "sonner";
 *   toast.success("Pickup scheduled.");
 *
 * Successful actions reach it through showResult() (see result-modal.tsx);
 * errors, warnings and "already exists" stay in the result modal.
 *
 * Colors come from the dashboard palette: dashboard.css applies its tokens
 * (light and .dark) to [data-sonner-toaster]. Font is the app's --font-sans.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={3500}
      visibleToasts={4}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 font-sans text-sm text-[var(--foreground)] shadow-lg [&_[data-icon]]:text-[var(--primary)] [&_[data-icon]_svg]:size-4",
          content: "min-w-0 flex-1",
          title: "truncate font-medium",
          description: "hidden", // one line only
          icon: "flex shrink-0 items-center",
          success: "[&_[data-icon]]:!text-[var(--success)]",
          error: "[&_[data-icon]]:!text-[var(--destructive)]",
          warning: "[&_[data-icon]]:!text-amber-500",
          info: "[&_[data-icon]]:!text-[var(--info)]",
        },
      }}
    />
  );
}
