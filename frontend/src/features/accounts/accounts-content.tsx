import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
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
import { useAuth } from "@/features/auth/context/auth-context";
import { ROLE_LABELS, type Role } from "@/features/auth/permissions";
import { Drawer } from "@/features/suppliers/components/drawer"; // shared side drawer
import { accountsApi, type Account } from "./accounts-api";
import { AccountForm } from "./components/account-form";

type RoleFilter = "all" | Role;
type Status = "active" | "pending" | "deactivated";

const PAGE_SIZE = 8;
const filters: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "intern", label: "Intern" },
];

const statusOf = (a: Account): Status =>
  !a.isActive ? "deactivated" : a.lastLoginAt ? "active" : "pending";
const statusTone: Record<Status, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-secondary text-secondary-foreground",
  deactivated: "bg-destructive/10 text-destructive",
};
const roleTone: Record<Role, string> = {
  admin: "bg-primary text-primary-foreground",
  staff: "bg-primary/10 text-primary",
  intern: "bg-secondary text-secondary-foreground",
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
  const [message, setMessage] = useState<{
    kind: "error" | "ok";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccounts(await accountsApi.list());
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (updated: Account) =>
    setAccounts((list) => list.map((a) => (a.id === updated.id ? updated : a)));

  const run = async (action: () => Promise<void>, ok: string) => {
    setMessage(null);
    try {
      await action();
      setMessage({ kind: "ok", text: ok });
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    }
  };

  const changeRole = (a: Account, role: Role) =>
    run(
      async () => replace(await accountsApi.update(a.id, { role })),
      `${a.name} is now ${ROLE_LABELS[role]}. They were signed out.`,
    );
  const toggleActive = (a: Account) =>
    run(
      async () =>
        replace(await accountsApi.update(a.id, { isActive: !a.isActive })),
      a.isActive ? `${a.name} was deactivated.` : `${a.name} was reactivated.`,
    );
  const remove = (a: Account) => {
    if (!window.confirm(`Delete ${a.name}? This can't be undone.`)) return;
    void run(async () => {
      await accountsApi.remove(a.id);
      setAccounts((list) => list.filter((x) => x.id !== a.id));
    }, `${a.name} was deleted.`);
  };

  const counts = useMemo(
    () => ({
      all: accounts.length,
      admin: accounts.filter((a) => a.role === "admin").length,
      staff: accounts.filter((a) => a.role === "staff").length,
      intern: accounts.filter((a) => a.role === "intern").length,
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

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            message.kind === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {message.text}
        </p>
      ) : null}

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
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading accounts...
                </TableCell>
              </TableRow>
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
                          className="h-8 rounded-md bg-secondary px-2 text-sm outline-none"
                        >
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
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
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => void toggleActive(a)}
                          >
                            {a.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-destructive"
                            onClick={() => remove(a)}
                          >
                            Delete
                          </Button>
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
            setMessage({
              kind: "ok",
              text: `${account.name} was added as ${ROLE_LABELS[account.role]}.`,
            });
          }}
        />
      </Drawer>
    </div>
  );
}
