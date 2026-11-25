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

// Everyone signed in can read; changing anything needs "suppliers:edit" (Admin, Operator, Super Admin).
// Staff can still mark their own pickups collected: updateStatus checks that itself.
const edit = requirePermission("suppliers:edit");

router.post("/pickups", edit, schedulePickup);
router.get("/pickups", getSchedule);
router.patch("/pickups/:id/status", updateStatus);
router.patch("/pickups/:id/archive", edit, archivePickup);
router.patch("/pickups/:id/restore", edit, restorePickup);
router.patch("/pickups/:id", edit, updatePickup);
router.delete("/pickups/:id", edit, deletePickup);
router.get("/pickups/supplier/:supplierId", getSupplierPickups);

router.get("/", listSuppliers);
// Signed consent forms are personal data: only people who manage suppliers can open them.
router.get("/:id/consent", edit, getConsentDocument);
router.get("/:id", getSupplier);
router.post("/", edit, upload.single("consentDocument"), createSupplier);
router.patch("/:id", edit, updateSupplier);
router.patch("/:id/review", requirePermission("suppliers:approve"), reviewSupplier);
router.delete("/:id", edit, deleteSupplier);
router.post("/:id/send-reminder", edit, sendReminder);

export default router;