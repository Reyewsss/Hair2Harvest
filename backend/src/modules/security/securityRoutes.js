import { Router } from "express";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requirePermission } from "../auth/middleware/authorize.js";
import { getSettings, updateSettings } from "./securityController.js";

const router = Router();

// Super Admin only: the "security:manage" permission is held by no other role.
router.use(h(verifyToken), requirePermission("security:manage"));
router.get("/", h(getSettings));
router.put("/", h(updateSettings));

export default router;
