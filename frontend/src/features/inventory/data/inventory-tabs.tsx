// Single source of truth for the Inventory sub-pages.
// The sidebar builds its dropdown from this list; /inventory itself is the overview dashboard.

export type InventoryTab =
  | "schedule"
  | "tracking"
  | "stock"
  | "rejected"
  | "history"
  | "reports";

export const INVENTORY_HREF = "/inventory";

export const inventoryHref = (tab: InventoryTab) => `${INVENTORY_HREF}/${tab}`;

const base: { value: InventoryTab; label: string }[] = [
  { value: "stock", label: "Raw Inventory" },
  { value: "rejected", label: "Rejected" },
  { value: "history", label: "History" },
  { value: "reports", label: "Reports" },
];

export const inventoryTabs = base.map((tab) => ({
  ...tab,
  href: inventoryHref(tab.value),
}));

export const isInventoryTab = (
  value: string | null | undefined,
): value is InventoryTab => base.some((tab) => tab.value === value);

/** True on /inventory and everything under it. */
export const isInventorySection = (pathname: string) =>
  pathname === INVENTORY_HREF || pathname.startsWith(`${INVENTORY_HREF}/`);

/** The sub-page the path points at, or null on the overview and outside inventory. */
export function getActiveInventoryTab(pathname: string): InventoryTab | null {
  const [, root, tab] = pathname.split("/");
  if (`/${root}` !== INVENTORY_HREF) return null;
  return isInventoryTab(tab) ? tab : null;
}
