import express from "express";
import {
  createSupplier,
  getSupplier,
  listSuppliers,
  reviewSupplier,
  updateSupplier,
} from "./supplierController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";

const router = express.Router();

// Supplier records hold personal contact details, so every route requires a session.
router.use(verifyToken);

router.get("/", listSuppliers);
router.get("/:id", getSupplier);
router.post("/", createSupplier);
router.patch("/:id", updateSupplier);
router.patch("/:id/review", reviewSupplier);

export default router;
