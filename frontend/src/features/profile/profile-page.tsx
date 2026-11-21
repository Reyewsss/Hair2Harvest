import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { showResult } from "@/shared/ui/result-modal";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/auth-context";
import { authApi, type ActivityEntry } from "@/features/auth/auth-api";
import { ROLE_LABELS } from "@/features/auth/permissions";

/* "My profile": the signed-in user's own details, loaded fresh from /auth/me.
 * They can change their name and password; role, email and status are admin-managed. */

const fieldClass =
  "h-10 w-full rounded-lg border-none bg-secondary px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

// Mirrors backend/src/modules/auth/utils/passwordPolicy.js
const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Upper and lowercase letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const formatDate = (iso?: string | null, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        ...(withTime ? { timeStyle: "short" } : {}),
      })
    : "—";

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

const actionLabel = (action: string) =>
  action.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function ProfilePage() {
  const { user, updateUser } = useAuth();

  // Refresh from the server so dates and status are current, not just what login returned.
  useEffect(() => {
    authApi
      .me()
      .then((r) => updateUser(r.user))
      .catch(() => {});
  }, [updateUser]);

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-lg text-muted-foreground">
          Your personal details, password and recent activity
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <aside className="flex flex-col gap-6">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="h-20 bg-primary/90" />
            <div className="-mt-10 flex flex-col items-center px-5 pb-5 text-center">
              <span className="flex size-20 items-center justify-center rounded-full border-4 border-card bg-secondary text-2xl font-semibold text-foreground">
                {initialsOf(user.name)}
              </span>
              <h2 className="mt-3 text-lg font-semibold">{user.name}</h2>
              <p className="text-sm break-all text-muted-foreground">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {ROLE_LABELS[user.role]}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    user.isActive === false
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {user.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
            </div>
            <dl className="flex flex-col gap-3 border-t px-5 py-4 text-sm">
              <InfoRow icon={<ShieldCheck />} label="Role" value={ROLE_LABELS[user.role]} />
              <InfoRow icon={<CalendarDays />} label="Member since" value={formatDate(user.createdAt)} />
              <InfoRow icon={<Clock />} label="Last sign-in" value={formatDate(user.lastLoginAt, true)} />
            </dl>
          </section>

          <RecentActivity />
        </aside>

        {/* Editable sections */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailsForm />
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function DetailsForm() {
  const { user, updateUser } = useAuth();
  const savedFirst = user?.firstName ?? user?.name.split(" ")[0] ?? "";
  const savedLast = user?.lastName ?? user?.name.split(" ").slice(1).join(" ") ?? "";
  const [firstName, setFirstName] = useState(savedFirst);
  const [lastName, setLastName] = useState(savedLast);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Pick up the fresh values once /auth/me returns.
  useEffect(() => {
    setFirstName(savedFirst);
    setLastName(savedLast);
  }, [savedFirst, savedLast]);

  const dirty = firstName.trim() !== savedFirst || lastName.trim() !== savedLast;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setError("Enter a first and last name.");
    setError("");
    setBusy(true);
    try {
      const { user: updated } = await authApi.updateProfile(firstName.trim(), lastName.trim());
      updateUser(updated);
      showResult({ type: "updated", title: "Profile updated" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<UserRound />} title="Personal details" description="How your name appears across Hair2Harvest">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <FormError>{error}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input
              className={fieldClass}
              value={firstName}
              maxLength={50}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name">
            <input
              className={fieldClass}
              value={lastName}
              maxLength={50}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Email" hint="Ask an administrator if your email needs to change.">
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className={cn(fieldClass, "pl-9")} value={user?.email ?? ""} disabled readOnly />
          </div>
        </Field>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-4"
            disabled={!dirty || busy}
            onClick={() => {
              setFirstName(savedFirst);
              setLastName(savedLast);
              setError("");
            }}
          >
            Reset
          </Button>
          <Button type="submit" className="h-10 px-5" disabled={!dirty || busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(fieldClass, "pr-10")}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!current) return setError("Enter your current password.");
    if (!passwordRules.every((r) => r.test(next))) {
      return setError("Your new password doesn't meet the requirements below.");
    }
    if (next !== confirm) return setError("The new passwords don't match.");
    setError("");
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      showResult({ type: "success", title: "Password changed" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      icon={<KeyRound />}
      title="Change password"
      description="You'll stay signed in here; other devices will be signed out"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <FormError>{error}</FormError> : null}
        <Field label="Current password">
          <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </Field>
        </div>
        <ul className="grid gap-1.5 text-xs sm:grid-cols-3">
          {passwordRules.map((rule) => {
            const ok = rule.test(next);
            return (
              <li
                key={rule.label}
                className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}
              >
                <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} />
                {rule.label}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end">
          <Button type="submit" className="h-10 px-5" disabled={busy || !current || !next || !confirm}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RecentActivity() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    authApi
      .activity()
      .then(setEntries)
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Recent activity</h3>
      {failed ? (
        <p className="text-sm text-muted-foreground">Couldn't load your activity.</p>
      ) : entries === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
          {entries.map((e) => (
            <li key={e._id} className="relative">
              <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
              <p className="text-sm font-medium">{actionLabel(e.action)}</p>
              <p className="truncate text-xs text-muted-foreground" title={e.remarks || e.item}>
                {e.remarks || e.item}
              </p>
              <p className="text-xs text-muted-foreground/80" title={formatDate(e.createdAt, true)}>
                {timeAgo(e.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
