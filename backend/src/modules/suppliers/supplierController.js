import mongoose from "mongoose";
import Supplier from "./supplierModel.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Accepts the public code (S-01) or a Mongo id. */
const findSupplier = (identifier) =>
  Supplier.findOne(
    mongoose.isValidObjectId(identifier)
      ? { $or: [{ code: identifier }, { _id: identifier }] }
      : { code: identifier },
  ).populate("reviewedBy", "name");

/* GET /api/suppliers?search=&barangay=&status=&page=&limit= */
export async function listSuppliers(req, res) {
  try {
    const { search, barangay, status, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (barangay) filter.barangay = barangay;
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
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
}

/* GET /api/suppliers/:id */
export async function getSupplier(req, res) {
  try {
    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
}

/* POST /api/suppliers — multi-step registration lands here on submit. */
export async function createSupplier(req, res) {
  try {
    const {
      shopName,
      owner,
      phone,
      email,
      barangay,
      address,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
    } = req.body;

    if (!shopName || !owner || !phone || !email || !barangay || !address) {
      return res.status(400).json({
        success: false,
        message: "Shop name, owner, phone, email, barangay and address are required",
      });
    }

    const last = await Supplier.findOne().sort({ code: -1 }).select("code shopCode");
    const nextNumber = last ? Number(last.code.split("-")[1]) + 1 : 1;

    const supplier = await Supplier.create({
      code: `S-${String(nextNumber).padStart(2, "0")}`,
      shopCode: `BBY-${String(100 + nextNumber).padStart(4, "0")}`,
      shopName,
      owner,
      phone,
      email,
      barangay,
      address,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Supplier registered and queued for review",
      supplier,
    });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
}

/* PATCH /api/suppliers/:id — supplier dashboard profile updates. */
export async function updateSupplier(req, res) {
  try {
    const allowed = [
      "shopName",
      "owner",
      "phone",
      "email",
      "barangay",
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

    Object.assign(supplier, patch);
    await supplier.save();

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
}

/* PATCH /api/suppliers/:id/review — admin approval or rejection. */
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
      return res
        .status(400)
        .json({ success: false, message: "Remarks are required to reject a shop" });
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
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error.message });
  }
}
