import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { buttonVariants } from "./button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
import { cn } from "@/lib/utils";

/* Generic form and summary primitives shared by every module page. */

export const fieldClass =
  "h-10 w-full rounded-lg border-none bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
  icon: Icon,
  align = "start",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  icon?: LucideIcon;
  align?: "start" | "end";
}) {
  const label = options.find((option) => option.value === value)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={buttonVariants({
          variant: "secondary",
          className: "h-10 gap-2 px-3",
        })}
      >
        {Icon ? <Icon className="size-5" /> : null}
        {label}
        <ChevronDown className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="astrix-dashboard min-w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as T)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex w-full items-center gap-1 overflow-x-auto rounded-[calc(var(--radius)+0.125rem)] border bg-secondary p-0.5 md:w-auto"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors md:flex-none",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint ? (
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function FormPanel({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-card p-4 md:p-5">
      {children}
    </form>
  );
}

export function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-3 md:p-4">
      <p className="text-xs font-medium text-muted-foreground md:text-sm">
        {label}
      </p>
      <p className="text-[1.625rem] leading-none font-semibold md:text-[2rem]">
        {value}
      </p>
      {note ? (
        <p className="text-xs font-medium text-muted-foreground">{note}</p>
      ) : null}
    </article>
  );
}

export function Pill({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
