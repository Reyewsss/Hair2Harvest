import express from "express";
import {
  createResult,
  getResult,
  latestByBatch,
  listResults,
} from "./labResultController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", listResults);
// Keep /latest above /:id so it is not read as an identifier.
router.get("/latest", latestByBatch);
router.get("/:id", getResult);
router.post("/", createResult);

export default router;
