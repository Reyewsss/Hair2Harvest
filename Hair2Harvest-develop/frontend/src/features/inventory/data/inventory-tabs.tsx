export type InventoryTab = "stock";

export const INVENTORY_HREF = "/inventory";

export const inventoryHref = (tab: InventoryTab) => `${INVENTORY_HREF}/${tab}`;

const base: { value: InventoryTab; label: string }[] = [
  { value: "stock", label: "Stock" },
];

export const inventoryTabs = base.map((tab) => ({
  ...tab,
  href: inventoryHref(tab.value),
}));

export const isInventoryTab = (
  value: string | null | undefined,
): value is InventoryTab => base.some((tab) => tab.value === value);

export const isInventorySection = (pathname: string) =>
  pathname === INVENTORY_HREF || pathname.startsWith(`${INVENTORY_HREF}/`);

export function getActiveInventoryTab(pathname: string): InventoryTab | null {
  const [, root, tab] = pathname.split("/");
  if (`/${root}` !== INVENTORY_HREF) return null;
  return isInventoryTab(tab) ? tab : null;
}
