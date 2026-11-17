import { Router } from "express";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requirePermission } from "../auth/middleware/authorize.js";
import { createAccount, deleteAccount, listAccounts, updateAccount, listStaff } from "./accountsController.js";

const router = Router();

router.use(h(verifyToken));

router.get("/staff", h(listStaff));

// Admin-only routes
router.use(requirePermission("accounts:manage"));
router.get("/", h(listAccounts));
router.post("/", h(createAccount));
router.patch("/:id", h(updateAccount));
router.delete("/:id", h(deleteAccount));

export default router;