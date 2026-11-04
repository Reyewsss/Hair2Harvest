import express from "express";
import {
  advancePickup,
  createLog,
  createPickup,
  inventorySummary,
  listLogs,
  listPickups,
} from "./collectionController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/pickups", listPickups);
router.post("/pickups", createPickup);
router.patch("/pickups/:id/advance", advancePickup);

router.get("/logs", listLogs);
router.post("/logs", createLog);

router.get("/summary", inventorySummary);

export default router;
