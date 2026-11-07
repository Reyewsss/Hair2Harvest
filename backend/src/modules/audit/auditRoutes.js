import express from "express";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requireRole } from "../auth/middleware/authorize.js";
import { exportAudit, listAudit } from "./auditController.js";

const router = express.Router();
router.use(verifyToken);
router.use(requireRole("admin"));

router.get("/", listAudit);
router.get("/export", exportAudit);

export default router;