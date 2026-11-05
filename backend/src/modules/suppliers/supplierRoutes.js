import express from "express";
import { 
  createSupplier, 
  deleteSupplier, // 👈 Added
  getSupplier, 
  listSuppliers, 
  reviewSupplier, 
  updateSupplier 
} from "./supplierController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { upload } from "./uploadConfig.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", listSuppliers);
router.get("/:id", getSupplier);
router.post("/", upload.single("consentDocument"), createSupplier);
router.patch("/:id", updateSupplier);
router.patch("/:id/review", reviewSupplier);
router.delete("/:id", deleteSupplier); // 👈 Added

export default router;