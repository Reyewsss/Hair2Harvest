import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { PageSkeleton } from "@/shared/ui/page-skeleton";
import { errorMessage } from "@/lib/api";
import { securityApi, type FieldInfo, type SecuritySettings } from "./security-api";

type Key = keyof SecuritySettings;
type Fields = Record<Key, FieldInfo>;

const fieldClass =
  "h-10 w-28 rounded-lg border-none bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

type Row = { key: Key; label: string; hint: string; unit?: string };

const sections: { title: string; description: string; rows: Row[] }[] = [
  {
    title: "Login protection",
    description: "Slows down password guessing. The account owner is emailed when a lockout happens.",
    rows: [
      { key: "loginMaxAttempts", label: "Failed attempts allowed", hint: "Wrong passwords before the account locks.", unit: "attempts" },
      { key: "loginLockoutSeconds", label: "Lockout duration", hint: "How long sign-in stays blocked.", unit: "seconds" },
    ],
  },
  {
    title: "Password policy",
    description: "Applies to new passwords, resets and password changes. Existing passwords keep working.",
    rows: [
      { key: "passwordMinLength", label: "Minimum length", hint: "Never lower than 8.", unit: "characters" },
      { key: "passwordRequireMixedCase", label: "Require upper and lower case", hint: "" },
      { key: "passwordRequireNumber", label: "Require a number", hint: "" },
      { key: "passwordRequireSymbol", label: "Require a symbol", hint: "For example ! @ # $." },
    ],
  },
  {
    title: "Verification codes (OTP)",
    description: "Super Admin, Admin and Operator always sign in with an emailed code.",
    rows: [
      { key: "otpTtlMinutes", label: "Code lifetime", hint: "How long an emailed code works.", unit: "minutes" },
      { key: "otpMaxAttempts", label: "Wrong guesses per code", hint: "After this the code is dead.", unit: "guesses" },
      { key: "otpResendSeconds", label: "Minimum gap between emails", hint: "Stops code spamming.", unit: "seconds" },
      { key: "staffRequiresOtp", label: "Require a code for Staff too", hint: "Staff currently sign in with password only." },
    ],
  },
  {
    title: "Sessions",
    description: "Changes apply to people who sign in after you save.",
    rows: [
      { key: "sessionHours", label: "Normal session length", hint: "Signed out after this, or when the browser closes.", unit: "hours" },
      { key: "rememberMeDays", label: "\"Remember me\" length", hint: "Must be longer than a normal session.", unit: "days" },
    ],
  },
];

export function SecurityContent() {
  const [saved, setSaved] = useState<SecuritySettings | null>(null);
  const [draft, setDraft] = useState<SecuritySettings | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    securityApi
      .get()
      .then(({ settings, fields }) => {
        setSaved(settings);
        setDraft(settings);
        setFields(fields);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const changed = useMemo(
    () => (saved && draft ? (Object.keys(draft) as Key[]).filter((k) => draft[k] !== saved[k]) : []),
    [saved, draft],
  );

  if (!draft || !saved || !fields) {
    return error ? (
      <p className="mx-auto max-w-7xl px-4 pt-8 text-destructive md:px-6">{error}</p>
    ) : (
      <PageSkeleton variant="form" />
    );
  }

  const set = (key: Key, value: number | boolean) => {
    setDraft({ ...draft, [key]: value });
    setNotice("");
    setError("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const patch = Object.fromEntries(changed.map((k) => [k, draft[k]])) as Partial<SecuritySettings>;
      const next = await securityApi.save(patch);
      setSaved(next);
      setDraft(next);
      setNotice("Security settings saved. They are enforced now.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Security Control</h1>
        <p className="text-lg text-muted-foreground">
          Security rules for the whole system. Only a Super Admin can change them, and every change is logged.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-4 rounded-xl border p-5">
          <div>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div className="flex flex-col divide-y">
            {section.rows.map((row) => {
              const info = fields[row.key];
              const value = draft[row.key];
              return (
                <label key={row.key} className="flex items-center justify-between gap-4 py-3">
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{row.label}</span>
                    {row.hint ? <span className="text-xs text-muted-foreground">{row.hint}</span> : null}
                  </span>
                  {info.type === "bool" ? (
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--primary)]"
                      checked={Boolean(value)}
                      onChange={(e) => set(row.key, e.target.checked)}
                    />
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="number"
                        className={fieldClass}
                        min={info.min}
                        max={info.max}
                        step={1}
                        value={Number.isNaN(value) ? "" : String(value)}
                        onChange={(e) => set(row.key, e.target.value === "" ? NaN : Number(e.target.value))}
                      />
                      <span className="w-20">{row.unit}</span>
                      <span className="hidden w-24 text-xs sm:inline">
                        {info.min}–{info.max}
                      </span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-success">{notice}</p> : null}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="h-10 px-5"
          disabled={busy || changed.length === 0 || changed.some((k) => Number.isNaN(draft[k]))}
          onClick={save}
        >
          {busy ? "Saving..." : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-5"
          disabled={busy || changed.length === 0}
          onClick={() => {
            setDraft(saved);
            setError("");
          }}
        >
          Discard
        </Button>
        {changed.length > 0 ? (
          <span className="text-sm text-muted-foreground">{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</span>
        ) : null}
      </div>
    </div>
  );
}
