import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Field } from "./supplier-shared";

export function SmsReminderForm({
  recipient,
  phone,
  defaultMessage,
  onSend,
  onCancel,
}: {
  recipient: string;
  phone: string;
  defaultMessage: string;
  onSend: (message: string) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const length = message.trim().length;
  const parts = Math.max(1, Math.ceil(length / 160));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (length === 0) return;
    onSend(message.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
          <p className="text-xs text-muted-foreground">To</p>
          <p className="font-medium">{recipient}</p>
          <p className="text-muted-foreground">{phone}</p>
        </div>
        <Field label="Message" hint={`${length} characters, about ${parts} SMS`}>
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
        <Button type="button" variant="outline" className="h-10" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-10" disabled={length === 0}>Send reminder</Button>
      </footer>
    </form>
  );
}