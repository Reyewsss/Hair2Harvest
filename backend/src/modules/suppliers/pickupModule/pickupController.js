// pickupModule/pickupController.js
import mongoose from "mongoose";
import { Pickup } from "./pickupModel.js";
import Supplier from "../supplierModel.js";
import { WeightLog } from "../../inventory/inventoryModel.js";
import { recordAudit } from "../../audit/auditController.js";
import { can } from "../../auth/utils/permissions.js";
import { sendSms } from "../utils/sms.js";

/* ─── HELPERS ────────────────────────────────────────────────────────── */

async function resolveSupplier(ref) {
  if (!ref) return null;
  const query = mongoose.isValidObjectId(ref) ? { _id: ref } : { code: ref };
  return Supplier.findOne(query);
}

// Accepts a Mongo id or a staff code; returns an ObjectId (or undefined if not found).
async function resolveStaffId(ref) {
  if (!ref) return undefined;
  if (mongoose.isValidObjectId(ref)) return ref;
  const { User } = await import("../auth/userModel.js").catch(() => ({}));
  if (!User) return undefined;
  const staff = await User.findOne({ code: ref }).lean();
  return staff?._id;
}

const DUPLICATE_MESSAGE =
  "A pickup already exists for this shop at that exact date and time.";

async function populateOne(pickupId) {
  return Pickup.findById(pickupId)
    .populate("supplierId", "shopName owner phone street barangay code")
    .populate("assignedTo", "name email")
    .populate("collectedBy", "name")
    .populate("deliveredBy", "name");
}

/* ─── SCHEDULE A PICKUP ──────────────────────────────────────────────── */
export async function schedulePickup(req, res) {
  try {
    const { supplierId, date, time, frequency, assignedTo } = req.body;

    if (!supplierId || !date || !time) {
      return res
        .status(400)
        .json({ message: "supplierId, date, and time are required" });
    }

    const supplier = await resolveSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const assignedToId = await resolveStaffId(assignedTo);

    const pickup = await Pickup.create({
      supplierId: supplier._id,
      scheduledDate: date,
      scheduledTime: time,
      frequency: frequency || "none",
      assignedTo: assignedToId,
      status: "scheduled",
    });

    const firstName = (supplier.owner || "there").split(" ")[0];
    const msg = `Hi ${firstName}, this is a reminder from Hair2Harvest: the next hair pickup at ${supplier.shopName} is on ${date} at ${time}. Please have your sacks ready. Thank you!`;

    sendSms(supplier.phone, msg).then((result) => {
      if (!result?.success) {
        console.error("Failed to send schedule SMS:", result?.error);
      }
    });

    await recordAudit({
      req,
      action: "schedule",
      module: "pickups",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: pickup._id.toString(),
      remarks: `Scheduled for ${date} at ${time}`,
    });

    const populated = await populateOne(pickup._id);
    res.status(201).json({ success: true, pickup: populated });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: DUPLICATE_MESSAGE });
    }
    res.status(500).json({ message: error.message });
  }
}

/* ─── UPDATE A SCHEDULED PICKUP (date / time / staff) ────────────────── */
export async function updatePickup(req, res) {
  try {
    const { date, time, assignedTo } = req.body;
    const pickup = await Pickup.findById(req.params.id).populate(
      "supplierId",
      "shopName code",
    );

    if (!pickup) return res.status(404).json({ message: "Pickup not found" });

    // Delivery is verified by an admin or operator, never by the staff who collected.
    if (status === "delivered" && !can(req.user?.role, "suppliers:edit")) {
      return res
        .status(403)
        .json({ message: "Only an admin or operator can verify a delivery." });
    }

    if (pickup.status !== "scheduled") {
      return res
        .status(400)
        .json({ message: "Only scheduled pickups can be edited." });
    }
    if (!date || !time) {
      return res.status(400).json({ message: "date and time are required" });
    }

    const before = `${pickup.scheduledDate} at ${pickup.scheduledTime}`;

    pickup.scheduledDate = date;
    pickup.scheduledTime = time;
    // Empty value = unassign
    pickup.assignedTo = assignedTo ? await resolveStaffId(assignedTo) : undefined;

    await pickup.save();

    await recordAudit({
      req,
      action: "update",
      module: "pickups",
      item: pickup.supplierId
        ? `${pickup.supplierId.shopName} (${pickup.supplierId.code})`
        : "[deleted supplier]",
      itemId: pickup._id.toString(),
      remarks: `Rescheduled from ${before} to ${date} at ${time}`,
    });

    const populated = await populateOne(pickup._id);
    res.status(200).json({ success: true, pickup: populated });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: DUPLICATE_MESSAGE });
    }
    res.status(500).json({ message: error.message });
  }
}

/* ─── DELETE A SCHEDULED PICKUP ──────────────────────────────────────── */
export async function deletePickup(req, res) {
  try {
    const pickup = await Pickup.findById(req.params.id).populate(
      "supplierId",
      "shopName code",
    );

    if (!pickup) return res.status(404).json({ message: "Pickup not found" });

    // Scheduled pickups and archived ones ("cancelled") can be deleted.
    if (!["scheduled", "cancelled"].includes(pickup.status)) {
      return res.status(400).json({
        message: "Collected or delivered pickups can't be deleted.",
      });
    }

    await pickup.deleteOne();

    await recordAudit({
      req,
      action: "delete",
      module: "pickups",
      item: pickup.supplierId
        ? `${pickup.supplierId.shopName} (${pickup.supplierId.code})`
        : "[deleted supplier]",
      itemId: pickup._id.toString(),
      remarks: `Removed pickup for ${pickup.scheduledDate} at ${pickup.scheduledTime}`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── ARCHIVE / RESTORE ──────────────────────────────────────────────── */
// Archived pickups are stored with status "cancelled" and shown in the Archived table.
export async function archivePickup(req, res) {
  try {
    const pickup = await Pickup.findById(req.params.id).populate(
      "supplierId",
      "shopName code",
    );
    if (!pickup) return res.status(404).json({ message: "Pickup not found" });

    if (pickup.status !== "scheduled") {
      return res
        .status(400)
        .json({ message: "Only scheduled pickups can be archived." });
    }

    pickup.status = "cancelled";
    await pickup.save();

    await recordAudit({
      req,
      action: "archive",
      module: "pickups",
      item: pickup.supplierId
        ? `${pickup.supplierId.shopName} (${pickup.supplierId.code})`
        : "[deleted supplier]",
      itemId: pickup._id.toString(),
      remarks: `Archived pickup for ${pickup.scheduledDate} at ${pickup.scheduledTime}`,
    });

    res.status(200).json({ success: true, pickup: await populateOne(pickup._id) });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

export async function restorePickup(req, res) {
  try {
    const pickup = await Pickup.findById(req.params.id).populate(
      "supplierId",
      "shopName code",
    );
    if (!pickup) return res.status(404).json({ message: "Pickup not found" });

    if (pickup.status !== "cancelled") {
      return res
        .status(400)
        .json({ message: "Only archived pickups can be restored." });
    }

    pickup.status = "scheduled";
    await pickup.save();

    await recordAudit({
      req,
      action: "restore",
      module: "pickups",
      item: pickup.supplierId
        ? `${pickup.supplierId.shopName} (${pickup.supplierId.code})`
        : "[deleted supplier]",
      itemId: pickup._id.toString(),
      remarks: `Restored pickup for ${pickup.scheduledDate} at ${pickup.scheduledTime}`,
    });

    res.status(200).json({ success: true, pickup: await populateOne(pickup._id) });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── GET SCHEDULE ───────────────────────────────────────────────────── */
export async function getSchedule(req, res) {
  try {
    const { date, scope } = req.query;
    const filter = {};

    if (scope === "past") {
      // Archived ("cancelled") pickups have their own table now.
      filter.status = "delivered";
    } else if (scope === "archived") {
      filter.status = "cancelled";
    } else {
      filter.status = { $in: ["scheduled", "collected"] };
      if (date) filter.scheduledDate = date;
    }

    const pickups = await Pickup.find(filter)
      .populate("supplierId", "shopName owner phone street barangay code")
      .populate("assignedTo", "name email")
      .populate("collectedBy", "name")
      .populate("deliveredBy", "name")
      .sort(
        scope === "past" || scope === "archived"
          ? { scheduledDate: -1, scheduledTime: -1 }
          : { scheduledDate: 1, scheduledTime: 1 }
      )
      .lean();

    const orphans = pickups.filter((p) => p.supplierId === null);
    if (orphans.length) {
      console.warn(
        `[getSchedule] ${orphans.length} pickup(s) reference a deleted supplier`
      );
      pickups.forEach((p) => {
        if (p.supplierId === null) {
          p.supplierId = { shopName: "[deleted supplier]", code: null };
        }
      });
    }

    res.status(200).json({ pickups });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── UPDATE STATUS ──────────────────────────────────────────────────── */
export async function updateStatus(req, res) {
  try {
    // 👇 sacks replaces weightKg
    const { status, photoUrl, sacks, notes } = req.body;
    const pickup = await Pickup.findById(req.params.id).populate("supplierId");

    if (!pickup) return res.status(404).json({ message: "Pickup not found" });

    if (!pickup.supplierId) {
      return res
        .status(400)
        .json({ message: "Supplier for this pickup no longer exists." });
    }

    // Validate sacks on collection
    if (status === "collected" && (sacks == null || Number(sacks) < 0)) {
      return res
        .status(400)
        .json({ message: "Number of sacks is required to mark as collected." });
    }

    // Automatic inventory tallying on delivered
    if (status === "delivered" && pickup.status === "collected") {
      const finalSacks = Number(sacks ?? pickup.sacks ?? 0);

      // 1. Push to supplier history (sacks only)
      await Supplier.findByIdAndUpdate(pickup.supplierId._id, {
        $push: {
          history: {
            id: `H-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            collector: req.user?.name || "Unknown",
            sacks: finalSacks,
            grade: "A",
          },
        },
      });

      // 2. Create the inventory WeightLog (sacks, no kg)
      await WeightLog.create({
        date: new Date().toISOString().slice(0, 10),
        type: "in",
        sacks: finalSacks,
        shopId: pickup.supplierId.code,
        pickupId: pickup._id.toString(),
        photoUrl: pickup.photoUrl,
      });
    }

    pickup.status = status;
    if (status === "collected") {
      pickup.collectedBy = req.user?._id;
      pickup.collectedAt = new Date();
      if (photoUrl) pickup.photoUrl = photoUrl;
      pickup.sacks = Number(sacks); // 👈 required
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
      remarks: `Marked as ${status}${
        status === "collected" ? ` — ${pickup.sacks} sack(s)` : ""
      }`,
    });

    const populated = await populateOne(pickup._id);
    res.status(200).json({ success: true, pickup: populated });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

/* ─── GET PICKUP HISTORY FOR ONE SUPPLIER ────────────────────────────── */
export async function getSupplierPickups(req, res) {
  try {
    const { supplierId } = req.params;

    const supplier = await resolveSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const pickups = await Pickup.find({ supplierId: supplier._id })
      .populate("supplierId", "shopName owner phone street barangay code")
      .populate("assignedTo", "name email")
      .populate("collectedBy", "name")
      .populate("deliveredBy", "name")
      .sort({ scheduledDate: -1, scheduledTime: -1 });

    res.status(200).json({ pickups });
  } catch (error) {
    console.error("🚨 PICKUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}