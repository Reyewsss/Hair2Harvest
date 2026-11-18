import express from "express";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { getDashboardData } from "./overviewController.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getDashboardData);

export default router;