import mongoose from "mongoose";
import { Pickup } from "./pickupModel.js";
import Supplier from "../supplierModel.js";
import { recordAudit } from "../../audit/auditController.js";
import { sendSms } from "../utils/sms.js";

/* ─── SCHEDULE A PICKUP ──────────────────────────────────────────────── */
export async function schedulePickup(req, res) {
  try {
    const { supplierId, date, time, frequency } = req.body;

    if (!supplierId || !date || !time) {
      return res.status(400).json({ message: "supplierId, date, and time are required" });
    }

    // 👇 FIX: Look up by _id OR code (e.g. "S-01")
    const query = mongoose.isValidObjectId(supplierId)
      ? { _id: supplierId }
      : { code: supplierId };
    
    const supplier = await Supplier.findOne(query);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    // 1. Create the pickup record using the real MongoDB _id
    const pickup = await Pickup.create({
      supplierId: supplier._id, // 👈 Use the real _id!
      scheduledDate: date,
      scheduledTime: time,
      frequency: frequency || "none",
      status: "scheduled",
    });

    // 2. Send SMS Notification
    const msg = `Hi ${supplier.owner.split(" ")[0]}, this is a reminder from Hair2Harvest: the next hair pickup at ${supplier.shopName} is on ${date} at ${time}. Please have your sacks ready. Thank you!`;
    
    sendSms(supplier.phone, msg).then((result) => {
      if (!result.success) console.error("Failed to send schedule SMS:", result.error);
    });

    await recordAudit({
      req,
      action: "schedule",
      module: "pickups",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: pickup._id.toString(),
      remarks: `Scheduled for ${date} at ${time}`,
    });

    res.status(201).json({ success: true, pickup });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A pickup is already scheduled for this exact time." });
    }
    res.status(500).json({ message: error.message });
  }
}

/* ─── GET SCHEDULE ───────────────────────────────────────────────────── */
export async function getSchedule(req, res) {
  try {
    const { date } = req.query;
    const filter = { status: { $in: ["scheduled", "collected"] } };
    if (date) filter.scheduledDate = date;

    const pickups = await Pickup.find(filter)
      .populate("supplierId", "shopName owner phone street barangay code")
      .sort({ scheduledTime: 1 });

    res.status(200).json({ pickups });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── UPDATE STATUS ──────────────────────────────────────────────────── */
export async function updateStatus(req, res) {
  try {
    const { status, photoUrl, weightKg, sacks, notes } = req.body;
    const pickup = await Pickup.findById(req.params.id).populate("supplierId");
    
    if (!pickup) return res.status(404).json({ message: "Pickup not found" });
    
    // Guard against orphaned pickups
    if (!pickup.supplierId) {
      return res.status(400).json({ message: "Supplier for this pickup no longer exists." });
    }

    if (status === "delivered" && pickup.status === "collected") {
      await Supplier.findByIdAndUpdate(pickup.supplierId._id, {
        $push: {
          history: {
            id: `H-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            collector: req.user?.name || "Unknown",
            sacks: sacks || pickup.sacks || 0,
            kg: weightKg || pickup.weightKg || 0,
            grade: "A",
          }
        }
      });
    }

    pickup.status = status;
    if (status === "collected") {
      pickup.collectedBy = req.user?._id;
      pickup.collectedAt = new Date();
      if (photoUrl) pickup.photoUrl = photoUrl;
      if (weightKg) pickup.weightKg = weightKg;
      if (sacks) pickup.sacks = sacks;
      if (notes) pickup.notes = notes;
    } else if (status === "delivered") {
      pickup.deliveredBy = req.user?._id;
      pickup.deliveredAt = new Date();
    }

    await pickup.save();

    await recordAudit({
      req,
      action: status,
      module: "pickups",
      item: `${pickup.supplierId.shopName} (${pickup.supplierId.code})`,
      itemId: pickup._id.toString(),
      remarks: `Marked as ${status}`,
    });

    res.status(200).json({ success: true, pickup });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── GET PICKUP HISTORY FOR ONE SUPPLIER ────────────────────────────── */
export async function getSupplierPickups(req, res) {
  try {
    const { supplierId } = req.params;
    
    // Find supplier by code (e.g. S-01) or _id
    const query = mongoose.isValidObjectId(supplierId)
      ? { _id: supplierId }
      : { code: supplierId };
    const supplier = await Supplier.findOne(query);
    
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const pickups = await Pickup.find({ supplierId: supplier._id })
      .sort({ scheduledDate: -1, scheduledTime: -1 }); // Newest first

    res.status(200).json({ pickups });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── GET SCHEDULE (for the list view) ───────────────────────────────── */
export async function getOldSchedule(req, res) {
  try {
    const { date, scope } = req.query; 
    let filter = {};

    if (scope === "past") {
      // Past records (for the history table)
      filter.status = { $in: ["collected", "delivered", "cancelled"] };
      if (date) filter.scheduledDate = { $lt: date }; // Before selected date
    } else {
      // Active records (for today or future)
      filter.status = { $in: ["scheduled", "collected"] };
      if (date) filter.scheduledDate = date;
    }

    const pickups = await Pickup.find(filter)
      .populate("supplierId", "shopName owner phone street barangay code")
      .populate("collectedBy", "name")
      .populate("deliveredBy", "name")
      .sort({ scheduledDate: -1, scheduledTime: -1 }); // Newest first

    res.status(200).json({ pickups });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}