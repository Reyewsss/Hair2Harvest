import { Router } from "express";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requirePermission } from "../auth/middleware/authorize.js";
import { getIdDocument, handleIdUpload, removeIdDocument, setIdDocument } from "./idDocumentController.js";
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
// Optional staff ID file (private; only people who manage accounts can see it)
router.post("/:id/id-document", handleIdUpload, h(setIdDocument));
router.get("/:id/id-document", h(getIdDocument));
router.delete("/:id/id-document", h(removeIdDocument));

export default router;