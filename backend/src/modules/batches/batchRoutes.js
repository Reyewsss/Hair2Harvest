import express from "express";
import { getBatch, listBatches } from "./batchController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", listBatches);
router.get("/:code", getBatch);

export default router;
