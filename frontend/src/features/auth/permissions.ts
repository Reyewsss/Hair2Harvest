// Keep this in sync with backend/src/modules/auth/utils/permissions.js.
// The backend is the real gatekeeper; this file only decides what the UI shows.
export type Role = "superadmin" | "admin" | "operator" | "staff";
export type Permission =
  | "accounts:manage"
  | "suppliers:edit"
  | "suppliers:approve"
  | "inventory:edit"
  | "security:manage"
  | "monitoring:view" // see the Machine and Compost pages (every role)
  | "monitoring:control"; // start/stop, simulate, change batches (not Staff)

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  operator: "Operator",
  staff: "Staff",
};

const matrix: Record<Role, Permission[]> = {
  superadmin: ["accounts:manage", "suppliers:edit", "suppliers:approve", "inventory:edit", "security:manage", "monitoring:view", "monitoring:control"],
  admin: ["accounts:manage", "suppliers:edit", "suppliers:approve", "inventory:edit", "monitoring:view", "monitoring:control"],
  operator: ["suppliers:edit", "inventory:edit", "monitoring:view", "monitoring:control"],
  // Staff can watch Machine and Compost but not control or simulate anything.
  staff: ["monitoring:view"], // otherwise read-only
};

export const can = (role: Role, permission: Permission) =>
  matrix[role].includes(permission);

// Administrator-level roles (Super Admin has everything Admin has).
export const isAdminRole = (role?: Role) => role === "admin" || role === "superadmin";

// Pages that need a permission. Everything not listed is open to every signed-in role.
const pageRules: { prefix: string; permission: Permission }[] = [
  { prefix: "/accounts", permission: "accounts:manage" },
  { prefix: "/security", permission: "security:manage" },
  { prefix: "/machine", permission: "monitoring:view" },
  { prefix: "/composting", permission: "monitoring:view" },
  { prefix: "/inventory/schedule", permission: "inventory:edit" },
  { prefix: "/inventory/tracking", permission: "inventory:edit" },
  { prefix: "/inventory/rejected", permission: "inventory:edit" },
];

export const canAccessPath = (role: Role, pathname: string) =>
  pageRules.every((rule) => !pathname.startsWith(rule.prefix) || can(role, rule.permission));