// Keep this in sync with frontend/src/features/auth/permissions.ts.
export const ROLES = ["admin", "staff", "intern"];

// Admin and staff sign in with an emailed code (2-step). Interns use email + password only.
export const OTP_ROLES = ["admin", "staff"];

const matrix = {
  admin: ["accounts:manage", "suppliers:edit", "inventory:edit"],
  staff: ["suppliers:edit", "inventory:edit"],
  intern: [], // read-only access to inventory and suppliers
};

export const can = (role, permission) => matrix[role]?.includes(permission) ?? false;