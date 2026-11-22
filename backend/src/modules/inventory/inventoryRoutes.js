import express from "express";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { requirePermission } from "../auth/middleware/authorize.js";
import { consumeSacks, getStock, listLogs } from "./inventoryController.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", listLogs);
router.get("/stock", getStock);
// Taking sacks out of stock (e.g. starting a compost batch): admin and operator only.
router.post("/processed", requirePermission("inventory:edit"), consumeSacks);

export default router;
