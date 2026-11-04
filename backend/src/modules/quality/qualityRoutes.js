import express from "express";
import {
  authorizeStatus,
  evaluateBatch,
  getThresholds,
  listDecisions,
  listHistory,
  updateThresholds,
} from "./qualityController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/thresholds", getThresholds);
router.put("/thresholds", updateThresholds);

router.get("/evaluate/:batchCode", evaluateBatch);

router.get("/decisions", listDecisions);
router.post("/decisions", authorizeStatus);

router.get("/history", listHistory);

export default router;
