import express from "express";
import {
  createSupplier,
  deleteSupplier,
  sendReminder,
  getSupplier,
  getConsentDocument,
  listSuppliers,
  reviewSupplier,
  updateSupplier
} from "./supplierController.js";
import {
  schedulePickup,
  getSchedule,
  updateStatus,
  getSupplierPickups,
  updatePickup,
  deletePickup,
  archivePickup,
  restorePickup
} from "./pickupModule/pickupController.js";
import { verifyToken } from "../auth/middleware/verifyToken.js";
import { upload } from "./uploadConfig.js";
import { requirePermission } from "../auth/middleware/authorize.js";

const router = express.Router();
router.use(verifyToken);

router.post("/pickups", schedulePickup);
router.get("/pickups", getSchedule);
router.patch("/pickups/:id/status", updateStatus);
router.patch("/pickups/:id/archive", archivePickup);
router.patch("/pickups/:id/restore", restorePickup);
router.patch("/pickups/:id", updatePickup);
router.delete("/pickups/:id", deletePickup);
router.get("/pickups/supplier/:supplierId", getSupplierPickups);

router.get("/", listSuppliers);
router.get("/:id/consent", getConsentDocument);
router.get("/:id", getSupplier);
router.post("/", upload.single("consentDocument"), createSupplier);
router.patch("/:id", updateSupplier);
router.patch("/:id/review", requirePermission("suppliers:approve"), reviewSupplier);
router.delete("/:id", deleteSupplier);
router.post("/:id/send-reminder", sendReminder);

export default router;