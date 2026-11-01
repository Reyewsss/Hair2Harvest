import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  accounts,
  type AccountRole,
  type AccountRow,
  type AccountStatus,
} from "../../accounts-data.tsx";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | AccountRole;

const PAGE_SIZE = 6;

const filters: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "intern", label: "Intern" },
];

export function AccountManagementContent({
  onAddAccount,
}: {
  onAddAccount?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const countRole = (role: AccountRole) =>
      accounts.filter((row) => row.role === role).length;

    return {
      all: accounts.length,
      admin: countRole("admin"),
      staff: countRole("staff"),
      intern: countRole("intern"),
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return accounts.filter((row) => {
      const matchesRole = roleFilter === "all" ? true : row.role === roleFilter;
      const matchesQuery =
        query === "" ||
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query);

      return matchesRole && matchesQuery;
    });
  }, [searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);

  const setFilter = (value: RoleFilter) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Account Management</h1>
          <p className="text-lg text-muted-foreground">
            Manage team accounts, roles and access
          </p>
        </div>
        <Button
          type="button"
          className="h-10 gap-1 px-3.5 md:self-auto"
          onClick={onAddAccount}
        >
          <Plus className="size-5" />
          Add account
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListFilter className="size-4" />
              Filters
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="inline-flex min-w-28 shrink-0 items-center justify-between gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {filters.find((filter) => filter.value === roleFilter)?.label}
                <ChevronDown className="size-4 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="astrix-dashboard min-w-44"
              >
                <DropdownMenuRadioGroup
                  value={roleFilter}
                  onValueChange={(value) => setFilter(value as RoleFilter)}
                >
                  {filters.map((filter) => (
                    <DropdownMenuRadioItem
                      key={filter.value}
                      value={filter.value}
                      className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
                    >
                      {filter.label}
                      <span className="ml-auto text-xs tabular-nums">
                        {counts[filter.value]}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <SearchField value={searchQuery} onChange={handleSearch} />
        </div>

        <div className="@container/toolbar hidden w-full min-w-0 md:block">
          <div className="flex w-full min-w-0 flex-col gap-3 @min-[52rem]/toolbar:flex-row @min-[52rem]/toolbar:items-center @min-[52rem]/toolbar:justify-between">
            <SearchField
              value={searchQuery}
              onChange={handleSearch}
              className="@min-[52rem]/toolbar:min-w-60 @min-[52rem]/toolbar:max-w-92.25 @min-[52rem]/toolbar:flex-1"
            />

            <div className="flex w-full items-center gap-1 rounded-[calc(var(--radius)+0.125rem)] border bg-secondary p-0.5 @min-[52rem]/toolbar:w-auto">
              {filters.map((filter) => {
                const isActive = roleFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setFilter(filter.value)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors @min-[52rem]/toolbar:flex-none",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        "inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-sm px-2 text-xs font-medium",
                        isActive
                          ? "bg-background text-primary"
                          : "bg-background text-foreground",
                      )}
                    >
                      {counts[filter.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Table className="min-w-215">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Date added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No accounts match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => <AccountRowItem key={row.id} row={row} />)
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="md:hidden">
              {pageRows.length} out of {filteredRows.length}
            </span>
            <span className="hidden md:inline">
              Showing {pageRows.length} of {filteredRows.length} account
              {filteredRows.length === 1 ? "" : "s"}
            </span>
          </p>

          <div className="flex w-full items-center justify-between md:w-auto md:justify-start md:gap-3">
            <div className="flex items-center">
              {getPageItems(currentPage, totalPages).map((item, index) => (
                <PageItem
                  key={`${item}-${index}`}
                  item={item}
                  currentPage={currentPage}
                  onSelect={setPage}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-10"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-10"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <InputGroup
      className={cn(
        "h-11 w-full border-none bg-secondary px-3 py-1",
        className,
      )}
    >
      <InputGroupAddon className="pl-0">
        <Search className="size-3.5 text-input-addon-foreground" />
      </InputGroupAddon>
      <InputGroupInput
        className="h-full p-0 px-1.5!"
        aria-label="Search accounts"
        placeholder="Search by name, email or account ID..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </InputGroup>
  );
}

const roleTone: Record<AccountRole, string> = {
  admin: "bg-primary text-primary-foreground",
  staff: "bg-primary/10 text-primary",
  intern: "bg-secondary text-secondary-foreground",
};

const statusTone: Record<AccountStatus, { label: string; className: string }> =
  {
    active: { label: "Active", className: "bg-success/10 text-success" },
    pending: {
      label: "Pending",
      className: "bg-secondary text-secondary-foreground",
    },
    deactivated: {
      label: "Deactivated",
      className: "bg-destructive/10 text-destructive",
    },
  };

function RoleBadge({ role }: { role: AccountRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-medium capitalize",
        roleTone[role],
      )}
    >
      {role}
    </span>
  );
}

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const { label, className } = statusTone[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AccountRowItem({ row }: { row: AccountRow }) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {initials(row.name)}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={row.role} />
      </TableCell>
      <TableCell>
        <AccountStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{row.lastActive}</TableCell>
      <TableCell className="text-muted-foreground">{row.added}</TableCell>
    </TableRow>
  );
}

function PageItem({
  item,
  currentPage,
  onSelect,
}: {
  item: number | "ellipsis";
  currentPage: number;
  onSelect: (page: number) => void;
}) {
  if (item === "ellipsis") {
    return (
      <span className="flex size-10 items-center justify-center text-sm text-muted-foreground">
        ...
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg text-sm transition-colors",
        item === currentPage
          ? "border border-primary font-bold text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item}
    </button>
  );
}

function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 2) {
    return [1, 2, "ellipsis", total - 1, total];
  }

  if (current >= total - 1) {
    return [1, 2, "ellipsis", total - 1, total];
  }

  return [1, "ellipsis", current, "ellipsis", total];
}
