import mongoose from "mongoose";
import Supplier from "./supplierModel.js";

const TARGET_BARANGAY = "Novaliches Proper"; // change to your actual barangay

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Accepts the public code (S-01) or a Mongo id. */
const findSupplier = (identifier) =>
  Supplier.findOne(
    mongoose.isValidObjectId(identifier)
      ? { $or: [{ code: identifier }, { _id: identifier }] }
      : { code: identifier },
  ).populate("reviewedBy", "name");

export async function listSuppliers(req, res) {
  try {
    const { search, status, page = 1, limit = 100 } = req.query;
    const filter = { barangay: TARGET_BARANGAY };

    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { shopName: pattern },
        { owner: pattern },
        { email: pattern },
        { shopCode: pattern },
        { code: pattern },
      ];
    }

    const perPage = Math.min(Number(limit) || 100, 200);
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .populate("reviewedBy", "name")
        .sort({ code: 1 })
        .skip((Number(page) - 1) * perPage)
        .limit(perPage),
      Supplier.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, page: Number(page), suppliers });
  } catch (error) {
    console.error("Error listing suppliers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getSupplier(req, res) {
  try {
    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function createSupplier(req, res) {
  try {
    const {
      shopName,
      owner,
      phone,
      email,
      address,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
    } = req.body;

    if (!shopName || !owner || !phone || !email || !address) {
      return res.status(400).json({
        success: false,
        message: "Shop name, owner, phone, email and address are required",
      });
    }

    const last = await Supplier.findOne().sort({ code: -1 }).select("code");
    const nextNumber = last ? Number(last.code.split("-")[1]) + 1 : 1;

    const hasFile = !!req.file;

    const supplier = await Supplier.create({
      code: `S-${String(nextNumber).padStart(2, "0")}`,
      shopCode: `BBY-${String(100 + nextNumber).padStart(4, "0")}`,
      shopName,
      owner,
      phone,
      email,
      barangay: TARGET_BARANGAY,
      address,
      operatingHours: JSON.parse(operatingHours || '{"days":"Mon-Sat","open":"09:00","close":"18:00"}'),
      pickupFrequency,
      weeklyVolumeKg: Number(weeklyVolumeKg) || 0,
      consentDocument: hasFile ? req.file.path : undefined,
      hasConsent: hasFile,
      status: hasFile ? "approved" : "pending",
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateSupplier(req, res) {
  try {
    const allowed = [
      "shopName",
      "owner",
      "phone",
      "email",
      "address",
      "operatingHours",
      "pickupFrequency",
      "weeklyVolumeKg",
    ];
    const patch = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key)),
    );

    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    // Ensure operatingHours is handled correctly if sent as a string
    if (typeof patch.operatingHours === "string") {
      try {
        patch.operatingHours = JSON.parse(patch.operatingHours);
      } catch (e) {
        delete patch.operatingHours;
      }
    }

    Object.assign(supplier, patch);
    supplier.barangay = TARGET_BARANGAY;
    await supplier.save();

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function reviewSupplier(req, res) {
  try {
    const { status, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }
    if (status === "rejected" && !remarks?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remarks are required to reject a shop",
      });
    }

    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    supplier.status = status;
    supplier.remarks = remarks?.trim();
    supplier.reviewedAt = new Date();
    supplier.reviewedBy = req.userId;
    await supplier.save();

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error reviewing supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// 👇 NEW: Delete supplier
export async function deleteSupplier(req, res) {
  try {
    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    // Optionally delete the uploaded file from disk
    if (supplier.consentDocument) {
      const fs = await import("fs");
      fs.unlink(supplier.consentDocument, () => {}); 
    }

    await Supplier.deleteOne({ _id: supplier._id });
    res.status(200).json({ success: true, message: "Supplier deleted" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}