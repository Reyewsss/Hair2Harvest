import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react"; // 👈 new
import { Button } from "@/shared/ui/button";
import { Field } from "./supplier-shared";

export function SmsReminderForm({
  recipient,
  phone,
  defaultMessage,
  onSend,
  onCancel,
  busy = false, // 👈 new
}: {
  recipient: string;
  phone: string;
  defaultMessage: string;
  onSend: (message: string) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean; // 👈 new
}) {
  const [message, setMessage] = useState(defaultMessage);
  const length = message.trim().length;
  const parts = Math.max(1, Math.ceil(length / 160));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || length === 0) return; // 👈 guard against double-submit
    await onSend(message.trim()); // 👈 await so parent can flip busy
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={busy}
    >
      <fieldset disabled={busy} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">To</p>
            <p className="font-medium">{recipient}</p>
            <p className="text-muted-foreground">{phone}</p>
          </div>
          <Field
            label="Message"
            hint={`${length} characters, about ${parts} SMS`}
          >
            <textarea
              autoFocus
              rows={7}
              className="w-full rounded-lg border-none bg-secondary px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-10 min-w-[140px]"
            disabled={busy || length === 0}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {busy ? "Sending..." : "Send reminder"}
          </Button>
        </footer>
      </fieldset>
    </form>
  );
}
