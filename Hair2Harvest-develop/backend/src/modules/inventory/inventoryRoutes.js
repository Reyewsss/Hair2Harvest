import express from "express";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { listLogs } from "./inventoryController.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", listLogs);

export default router;