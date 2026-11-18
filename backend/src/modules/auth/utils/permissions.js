// Keep this in sync with frontend/src/features/auth/permissions.ts.
export const ROLES = ["admin", "operator", "staff"];

// Admin and operator sign in with an emailed code (2-step).
// Staff signs in with email + password only.
export const OTP_ROLES = ["admin", "operator"];

const matrix = {
  admin: ["accounts:manage", "suppliers:edit", "inventory:edit"],
  operator: ["suppliers:edit", "inventory:edit"],
  staff: [], // read-only access to inventory and suppliers
};

export const can = (role, permission) => matrix[role]?.includes(permission) ?? false;