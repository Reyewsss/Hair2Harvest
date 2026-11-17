import express from "express";
import { 
  createSupplier, 
  deleteSupplier, 
  sendReminder,
  getSupplier, 
  listSuppliers, 
  reviewSupplier, 
  updateSupplier 
} from "./supplierController.js";
import { 
  schedulePickup, 
  getSchedule, 
  updateStatus,
  getSupplierPickups
} from "./pickupModule/pickupController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { upload } from "./uploadConfig.js";

const router = express.Router();
router.use(verifyToken);

router.post("/pickups", schedulePickup);
router.get("/pickups", getSchedule);
router.patch("/pickups/:id/status", updateStatus);
router.get("/pickups/supplier/:supplierId", getSupplierPickups);

router.get("/", listSuppliers);
router.get("/:id", getSupplier);
router.post("/", upload.single("consentDocument"), createSupplier);
router.patch("/:id", updateSupplier);
router.patch("/:id/review", reviewSupplier);
router.delete("/:id", deleteSupplier); 
router.post("/:id/send-reminder", sendReminder);

export default router;