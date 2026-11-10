import { Router } from "express";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requirePermission } from "../auth/middleware/authorize.js";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./accountsController.js";

const router = Router();

// Administrators only. Staff and interns get 403 on every route here.
router.use(h(verifyToken), requirePermission("accounts:manage"));

router.get("/", h(listAccounts));
router.post("/", h(createAccount));
router.patch("/:id", h(updateAccount));
router.delete("/:id", h(deleteAccount));

export default router;