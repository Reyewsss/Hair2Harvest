// Keep this in sync with backend/src/modules/auth/utils/permissions.js.
// The backend is the real gatekeeper; this file only decides what the UI shows.
export type Role = "admin" | "staff" | "intern";
export type Permission = "accounts:manage" | "suppliers:edit" | "inventory:edit";

export const ROLE_LABELS: Record<Role, string> = { admin: "Admin", staff: "Staff", intern: "Intern" };

const matrix: Record<Role, Permission[]> = {
  admin: ["accounts:manage", "suppliers:edit", "inventory:edit"],
  staff: ["suppliers:edit", "inventory:edit"],
  intern: [], // can look at inventory and suppliers, but not change them
};

export const can = (role: Role, permission: Permission) => matrix[role].includes(permission);

// Pages that need a permission. Everything not listed is open to every signed-in role.
const pageRules: { prefix: string; permission: Permission }[] = [
  { prefix: "/accounts", permission: "accounts:manage" },
  // Inventory pages that change data:
  { prefix: "/inventory/schedule", permission: "inventory:edit" },
  { prefix: "/inventory/tracking", permission: "inventory:edit" },
  { prefix: "/inventory/rejected", permission: "inventory:edit" },
];

export const canAccessPath = (role: Role, pathname: string) =>
  pageRules.every((rule) => !pathname.startsWith(rule.prefix) || can(role, rule.permission));