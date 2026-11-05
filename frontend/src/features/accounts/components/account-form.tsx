import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react"; // 👈 Added import
import { Button } from "@/shared/ui/button";
import { errorMessage } from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/features/auth/permissions";
import { accountsApi, type Account } from "../accounts-api";

const fieldClass =
  "h-10 w-full rounded-lg border-none bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const rules = [
  (p: string) => p.length >= 8,
  (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  (p: string) => /\d/.test(p),
];

export function AccountForm({
  onCreated,
  onCancel,
}: {
  onCreated: (account: Account) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("intern");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 👈 Added state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim())
      return setError("Enter a name and an email.");
    if (!rules.every((rule) => rule(password)))
      return setError(
        "Password needs 8+ characters, upper and lowercase letters, and a number.",
      );
    if (password !== confirm) return setError("The passwords don't match.");
    setError("");
    setBusy(true);
    try {
      onCreated(
        await accountsApi.create({
          name: name.trim(),
          email: email.trim(),
          role,
          password,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Full name
          <input
            autoFocus
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Role
          <select
            className={fieldClass}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted-foreground">
            {role === "intern"
              ? "Signs in with email and password."
              : "Signs in with email, password and an emailed code."}
          </span>
        </label>

        {/* 👈 Password input with toggle */}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Temporary password
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`${fieldClass} pr-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </label>

        {/* 👈 Confirm Password input with toggle */}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Confirm password
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              className={`${fieldClass} pr-10`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </label>
        <p className="text-xs text-muted-foreground">
          Share the password with them privately. They can change it with
          "Forgot password" on the sign-in screen.
        </p>
      </div>
      <footer className="flex justify-end gap-2 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-10" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </Button>
      </footer>
    </form>
  );
}
