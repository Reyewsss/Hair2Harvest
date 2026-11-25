import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, IdCard, Loader2, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ActionButton } from "@/shared/ui/action-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { closeModal, confirm, openModal } from "@/shared/ui/modal";
import { isDuplicateError, showResult } from "@/shared/ui/result-modal";
import { notifyAccountsChanged } from "@/features/dashboard-shell/components/sidebar";
import { useAuth } from "@/features/auth/context/auth-context";
import { ROLE_LABELS, type Role } from "@/features/auth/permissions";
import { Drawer } from "@/features/suppliers/components/drawer"; // shared side drawer
import { accountsApi, type Account } from "./accounts-api";
import { AccountForm } from "./components/account-form";
import { TableRowsSkeleton } from "@/shared/ui/page-skeleton";

type RoleFilter = "all" | Role;
type Status = "active" | "pending" | "deactivated";

const PAGE_SIZE = 8;

/** Dialog for the optional contact details and ID: mobile (pickup SMS), reminder email, ID file. */
function DetailsEditor({ account, onSaved }: { account: Account; onSaved: (a: Account) => void }) {
  const [current, setCurrent] = useState(account);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [notifyEmail, setNotifyEmail] = useState(account.notifyEmail ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const busy = saving || removing;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let next = current;
      if (phone.trim() !== (current.phone ?? "") || notifyEmail.trim() !== (current.notifyEmail ?? "")) {
        next = await accountsApi.update(current.id, { phone: phone.trim(), notifyEmail: notifyEmail.trim() });
      }
      if (file) next = await accountsApi.uploadId(current.id, file);
      onSaved(next);
      closeModal();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const removeId = async () => {
    setRemoving(true);
    setError("");
    try {
      const next = await accountsApi.removeId(current.id);
      setCurrent(next);
      onSaved(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const input =
    "h-10 w-full rounded-lg border-none bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <form className="space-y-4" onSubmit={save}>
      <p className="text-sm text-muted-foreground">
        Optional details for {current.name}. Leave a field blank to clear it.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Mobile number
        <input type="tel" inputMode="tel" placeholder="09XX XXX XXXX" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <span className="text-xs font-normal text-muted-foreground">Pickup assignments are texted here.</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Reminder email
        <input
          type="email"
          placeholder={current.email}
          className={input}
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
        />
        <span className="text-xs font-normal text-muted-foreground">Collection reminders go here. Blank uses the login email.</span>
      </label>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        ID document
        {current.hasIdDocument ? (
          <div className="flex items-center gap-2 text-sm font-normal">
            <a href={accountsApi.idUrl(current.id)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              View current ID
            </a>
            <ActionButton icon={Trash2} label="Remove" tone="danger" loading={removing} disabled={busy} onClick={removeId} />
          </div>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">No ID on file.</span>
        )}
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-xs font-normal text-muted-foreground">
          {current.hasIdDocument ? "Choose a file to replace it. " : ""}PDF, JPG or PNG, up to 5 MB.
        </span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => closeModal()}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
const filters: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "staff", label: "Staff" },
];

const statusOf = (a: Account): Status =>
  !a.isActive ? "deactivated" : a.lastLoginAt ? "active" : "pending";
const statusTone: Record<Status, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-secondary text-secondary-foreground",
  deactivated: "bg-destructive/10 text-destructive",
};
const roleTone: Record<Role, string> = {
  superadmin: "bg-primary text-primary-foreground",
  admin: "bg-primary text-primary-foreground",
  operator: "bg-primary/10 text-primary",
  staff: "bg-secondary text-secondary-foreground",
};
const dateText = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// Administrators only (the route guard and the server both enforce this).
export function AccountManagementContent() {
  const { user: me } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccounts(await accountsApi.list());
    } catch (err) {
      showResult({
        type: "error",
        title: "Couldn't load accounts",
        message: errorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (updated: Account) =>
    setAccounts((list) => list.map((a) => (a.id === updated.id ? updated : a)));

  type Outcome = {
    type: "updated" | "deleted";
    title: string;
    message: string;
  };

  // account id -> the action running on it; drives the per-row spinner
  const [pending, setPending] = useState<Record<string, string>>({});
  const track = async (id: string, name: string, fn: () => Promise<void>) => {
    setPending((m) => ({ ...m, [id]: name }));
    try {
      await fn();
    } finally {
      setPending(({ [id]: _done, ...rest }) => rest);
    }
  };

  const run = async (action: () => Promise<void>, outcome: Outcome) => {
    try {
      await action();
      showResult(outcome);
    } catch (err) {
      showResult({
        type: isDuplicateError(err) ? "exists" : "error",
        title: isDuplicateError(err)
          ? "Already exists"
          : "Something went wrong",
        message: errorMessage(err),
      });
    }
  };

  const changeRole = (a: Account, role: Role) =>
    track(a.id, "role", () => run(async () => replace(await accountsApi.update(a.id, { role })), {
      type: "updated",
      title: "Role updated",
      message: `${a.name} is now ${ROLE_LABELS[role]}. They were signed out.`,
    }));

  const editDetails = (a: Account) =>
    openModal({
      title: "Contact details and ID",
      size: "sm",
      content: <DetailsEditor account={a} onSaved={replace} />,
    });

  const toggleActive = (a: Account) =>
    track(a.id, "toggle", () => run(
      async () =>
        replace(await accountsApi.update(a.id, { isActive: !a.isActive })),
      {
        type: "updated",
        title: a.isActive ? "Account deactivated" : "Account reactivated",
        message: a.isActive
          ? `${a.name} can no longer sign in.`
          : `${a.name} can sign in again.`,
      },
    ));

  const remove = (a: Account) => {
    confirm({
      title: `Delete ${a.name}?`,
      description: `${a.email} will lose access. This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
      onConfirm: () =>
        track(a.id, "delete", () => run(
          async () => {
            await accountsApi.remove(a.id);
            setAccounts((list) => list.filter((x) => x.id !== a.id));
            notifyAccountsChanged();
          },
          {
            type: "deleted",
            title: "Account deleted",
            message: `${a.name} (${a.email}) was permanently removed.`,
          },
        )),
    });
  };

  const counts = useMemo(
    () => ({
      all: accounts.length,
      superadmin: accounts.filter((a) => a.role === "superadmin").length,
      admin: accounts.filter((a) => a.role === "admin").length,
      operator: accounts.filter((a) => a.role === "operator").length,
      staff: accounts.filter((a) => a.role === "staff").length,
    }),
    [accounts],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (roleFilter === "all" || a.role === roleFilter) &&
        (q === "" ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)),
    );
  }, [accounts, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Account Management</h1>
          <p className="text-lg text-muted-foreground">
            Create accounts and control who can do what
          </p>
        </div>
        <Button
          type="button"
          className="h-10 gap-1 px-3.5"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-5" />
          Add account
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <InputGroup className="h-11 w-full border-none bg-secondary px-3 py-1 md:max-w-sm">
            <InputGroupAddon className="pl-0">
              <Search className="size-3.5 text-input-addon-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-full p-0 px-1.5!"
              aria-label="Search accounts"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-secondary p-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setRoleFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  roleFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className="rounded-sm bg-background px-1.5 text-xs text-foreground">
                  {counts[f.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Table className="min-w-215">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Date added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton colSpan={6} rows={6} />
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No accounts match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((a) => {
                const isMe = a.id === me?.id;
                const status = statusOf(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                          {initials(a.name)}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">
                            {a.name}
                            {isMe ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.email}
                          </p>
                          {a.phone ? (
                            <p className="truncate text-xs text-muted-foreground">{a.phone}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isMe ? (
                        <span
                          className={cn(
                            "inline-flex rounded-xl px-2 py-0.5 text-xs font-medium",
                            roleTone[a.role],
                          )}
                        >
                          {ROLE_LABELS[a.role]}
                        </span>
                      ) : (
                        <select
                          aria-label={`Role for ${a.name}`}
                          value={a.role}
                          onChange={(e) =>
                            void changeRole(a, e.target.value as Role)
                          }
                          disabled={Boolean(pending[a.id])}
                          className="h-8 rounded-md bg-secondary px-2 text-sm outline-none disabled:opacity-50"
                        >
                          {(Object.keys(ROLE_LABELS) as Role[])
                            .filter((r) => r !== "superadmin" || me?.role === "superadmin")
                            .map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-xl px-2 py-0.5 text-xs font-medium capitalize",
                          statusTone[status],
                        )}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateText(a.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateText(a.createdAt)}
                    </TableCell>
                    <TableCell>
                      {isMe ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <ActionButton
                            icon={IdCard}
                            label="Details"
                            tone="default"
                            disabled={Boolean(pending[a.id])}
                            onClick={() => editDetails(a)}
                          />
                          <ActionButton
                            icon={a.isActive ? UserX : UserCheck}
                            label={a.isActive ? "Deactivate" : "Activate"}
                            tone={a.isActive ? "muted" : "success"}
                            loading={pending[a.id] === "toggle"}
                            disabled={Boolean(pending[a.id])}
                            onClick={() => toggleActive(a)}
                          />
                          <ActionButton
                            icon={Trash2}
                            label="Delete"
                            tone="danger"
                            loading={pending[a.id] === "delete"}
                            disabled={Boolean(pending[a.id])}
                            onClick={() => remove(a)}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pageRows.length} of {rows.length} account
            {rows.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-10"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {current} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-10"
              aria-label="Next page"
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <Drawer
        open={creating}
        title="Add account"
        description="They sign in with the email and password you set."
        onClose={() => setCreating(false)}
      >
        <AccountForm
          onCancel={() => setCreating(false)}
          onCreated={(account) => {
            setAccounts((list) => [account, ...list]);
            setCreating(false);
            notifyAccountsChanged();
            showResult({
              type: "created",
              title: "Account created",
              message: `${account.name} was added as ${ROLE_LABELS[account.role]}.`,
              details: [
                { label: "Name", value: account.name },
                { label: "Email", value: account.email },
                { label: "Role", value: ROLE_LABELS[account.role] },
              ],
            });
          }}
        />
      </Drawer>
    </div>
  );
}
