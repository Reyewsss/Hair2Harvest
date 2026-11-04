import express from "express";
import {
  addGrowthLog,
  createExperiment,
  getExperiment,
  getTraceability,
  listExperiments,
} from "./experimentController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", listExperiments);
router.get("/:id", getExperiment);
router.get("/:id/traceability", getTraceability);
router.post("/", createExperiment);
router.post("/:id/growth", addGrowthLog);

export default router;
