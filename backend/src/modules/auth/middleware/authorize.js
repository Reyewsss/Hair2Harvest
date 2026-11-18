import { can } from "../utils/permissions.js";

// Use after verifyToken.
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "You don't have access to this." });

export const requirePermission =
  (...permissions) =>
  (req, res, next) =>
    permissions.every((p) => can(req.user?.role, p))
      ? next()
      : res.status(403).json({ message: "You don't have permission to do that." });