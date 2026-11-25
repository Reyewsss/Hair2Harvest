// Keep this in sync with frontend/src/features/auth/permissions.ts.
export const ROLES = ["superadmin", "admin", "operator", "staff"];

// Admin and operator sign in with an emailed code (2-step).
// Staff signs in with email + password only.
export const OTP_ROLES = ["superadmin", "admin", "operator"];

// Roles with administrator-level access (everything an admin can do).
export const ADMIN_ROLES = ["superadmin", "admin"];

const matrix = {
  // Super Admin = Admin + control of security settings.
  superadmin: ["accounts:manage", "suppliers:edit", "suppliers:approve", "inventory:edit", "security:manage"],
  admin: ["accounts:manage", "suppliers:edit", "suppliers:approve", "inventory:edit"],
  operator: ["suppliers:edit", "inventory:edit"],
  staff: [], // read-only access to inventory and suppliers
};

export const can = (role, permission) => matrix[role]?.includes(permission) ?? false;