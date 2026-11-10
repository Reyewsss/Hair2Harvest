// frontend/src/features/suppliers/data/supplier-tabs.ts

export const SUPPLIER_HREF = "/suppliers";

export const supplierTabs = [
  { value: "schedule", label: "Schedule", href: "/suppliers/schedule" },
  { value: "tracking", label: "Tracking", href: "/suppliers/tracking" },
];

export const getActiveSupplierTab = (pathname: string) => {
  // Match the specific sub-routes
  const tab = supplierTabs.find((t) => t.href === pathname);
  return tab ? tab.value : null;
};

export const isSupplierSection = (pathname: string) => {
  return pathname.startsWith(SUPPLIER_HREF);
};