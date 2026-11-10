import mongoose from "mongoose";
import Supplier from "./supplierModel.js";
import { recordAudit } from "../audit/auditController.js";
import { geocodeAddress } from "./utils/geocode.js";
import { sendSms } from "./utils/sms.js";

export const TARGET_BARANGAY = "Barangay Novaliches Proper";
const CONSENT_VERSION = "v1.0-2025-01";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findSupplier = (identifier) =>
  Supplier.findOne(
    mongoose.isValidObjectId(identifier)
      ? { $or: [{ code: identifier }, { _id: identifier }] }
      : { code: identifier },
  ).populate("reviewedBy", "name");

function getManualPin(body) {
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  const pinManuallySet = body.pinManuallySet === "true";
  return pinManuallySet && Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : null;
}

/* ─── LIST / GET ─────────────────────────────────────────────────────── */

export async function listSuppliers(req, res) {
  try {
    const { search, status, page = 1, limit = 100 } = req.query;

    // 👇 No barangay filter — the whole app is single-barangay, and this was
    // blocking records saved with "Novaliches Proper" (no prefix) from the
    // commercial website.
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { shopName: pattern },
        { owner: pattern },
        { email: pattern },
        { street: pattern },
        { unit: pattern },
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

/* ─── CREATE ─────────────────────────────────────────────────────────── */

export async function createSupplier(req, res) {
  try {
    const {
      shopName,
      owner,
      phone,
      email,
      street,
      unit,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
      registrationSource,
      consentAgreedBy,
    } = req.body;

    if (!shopName || !owner || !phone || !email || !street) {
      return res.status(400).json({
        success: false,
        message: "Shop name, owner, phone, email and street are required",
      });
    }

    // 👇 Added "web" for shops registered via the commercial website
    if (!["admin", "self", "web"].includes(registrationSource)) {
      return res.status(400).json({
        success: false,
        message: "registrationSource must be 'admin', 'self', or 'web'",
      });
    }
    if (!consentAgreedBy || !String(consentAgreedBy).trim()) {
      return res.status(400).json({
        success: false,
        message: "Consent is required before registration can complete",
      });
    }

    const hasFile = !!req.file;
    if (registrationSource === "admin" && !hasFile) {
      return res.status(400).json({
        success: false,
        message: "Admin registration requires the signed consent PDF",
      });
    }

    const manualPin = getManualPin(req.body);
    const geo = manualPin ?? (await geocodeAddress({ street, unit }));

    const last = await Supplier.findOne().sort({ code: -1 }).select("code");
    const nextNumber = last ? Number(last.code.split("-")[1]) + 1 : 1;
    // Admin-registered → approved immediately. Self/web → pending review.
    const status = registrationSource === "admin" ? "approved" : "pending";

    const supplier = await Supplier.create({
      code: `S-${String(nextNumber).padStart(2, "0")}`,
      shopCode: `BBY-${String(100 + nextNumber).padStart(4, "0")}`,
      shopName,
      owner,
      phone,
      email,
      barangay: TARGET_BARANGAY,
      street: street.trim(),
      unit: unit?.trim() || undefined,
      lat: geo.lat,
      lng: geo.lng,
      operatingHours: JSON.parse(
        operatingHours || '{"days":"Mon-Sat","open":"09:00","close":"18:00"}',
      ),
      pickupFrequency,
      weeklyVolumeKg: Number(weeklyVolumeKg) || 0,
      status,
      registrationSource,
      consent: {
        agreed: true,
        agreedBy: String(consentAgreedBy).trim(),
        agreedAt: new Date(),
        version: CONSENT_VERSION,
        document: hasFile ? req.file.path : undefined,
      },
    });

    await recordAudit({
      req,
      actor: { name: consentAgreedBy, _id: req.user?._id },
      action: "create",
      module: "suppliers",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: supplier._id.toString(),
      remarks: `Registered via ${registrationSource}${hasFile ? " with signed PDF" : ""}${
        manualPin ? "; pin set manually" : ""
      }; status: ${status}`,
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/* ─── UPDATE ─────────────────────────────────────────────────────────── */

export async function updateSupplier(req, res) {
  try {
    const allowed = [
      "shopName",
      "owner",
      "phone",
      "email",
      "street",
      "unit",
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

    if (typeof patch.operatingHours === "string") {
      try {
        patch.operatingHours = JSON.parse(patch.operatingHours);
      } catch {
        delete patch.operatingHours;
      }
    }

    const manualPin = getManualPin(req.body);
    let pinChangedByAdmin = false;

    if (manualPin) {
      patch.lat = manualPin.lat;
      patch.lng = manualPin.lng;
      pinChangedByAdmin = true;
    } else {
      const addressChanged =
        (patch.street !== undefined && patch.street !== supplier.street) ||
        (patch.unit !== undefined && patch.unit !== supplier.unit);

      if (addressChanged) {
        const geo = await geocodeAddress({
          street: patch.street ?? supplier.street,
          unit: patch.unit ?? supplier.unit,
        });
        patch.lat = geo.lat;
        patch.lng = geo.lng;
      }
    }

    const changed = [];
    for (const key of Object.keys(patch)) {
      if (JSON.stringify(supplier[key]) !== JSON.stringify(patch[key])) {
        changed.push(key);
      }
    }
    if (pinChangedByAdmin && !changed.includes("pin")) changed.push("pin");

    Object.assign(supplier, patch);
    supplier.barangay = TARGET_BARANGAY;
    await supplier.save();

    await recordAudit({
      req,
      action: "update",
      module: "suppliers",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: supplier._id.toString(),
      remarks: changed.length
        ? `Changed: ${changed.join(", ")}`
        : "Saved without field changes",
    });

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/* ─── REVIEW ─────────────────────────────────────────────────────────── */

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

    // Only admin-registered shops are already verified — self and web go through review
    if (supplier.registrationSource === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin-registered shops are already verified",
      });
    }

    supplier.status = status;
    supplier.remarks = remarks?.trim();
    supplier.reviewedAt = new Date();
    supplier.reviewedBy = req.userId ?? req.user?._id;
    await supplier.save();

    await recordAudit({
      req,
      action: status === "approved" ? "approve" : "reject",
      module: "suppliers",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: supplier._id.toString(),
      remarks: remarks?.trim() || (status === "approved" ? "Approved" : "Rejected"),
    });

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    console.error("Error reviewing supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/* ─── DELETE ─────────────────────────────────────────────────────────── */

export async function deleteSupplier(req, res) {
  try {
    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    const snapshot = {
      shopName: supplier.shopName,
      code: supplier.code,
      id: supplier._id.toString(),
    };

    if (supplier.consent?.document) {
      const fs = await import("fs");
      fs.unlink(supplier.consent.document, () => {});
    }

    await Supplier.deleteOne({ _id: supplier._id });

    await recordAudit({
      req,
      action: "delete",
      module: "suppliers",
      item: `${snapshot.shopName} (${snapshot.code})`,
      itemId: snapshot.id,
      remarks: "Supplier removed",
    });

    res.status(200).json({ success: true, message: "Supplier deleted" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/* ─── SEND REMINDER ──────────────────────────────────────────────────── */

export async function sendReminder(req, res) {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message body is required",
      });
    }

    const supplier = await findSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    if (supplier.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved (enrolled) shops can receive reminders",
      });
    }

    const result = await sendSms(supplier.phone, message.trim());

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.error || "SMS gateway failed",
      });
    }

    supplier.lastReminder = {
      at: new Date().toISOString(),
      message: message.trim(),
    };
    await supplier.save();

    await recordAudit({
      req,
      action: "reminder",
      module: "suppliers",
      item: `${supplier.shopName} (${supplier.code})`,
      itemId: supplier._id.toString(),
      remarks: `SMS reminder sent to ${supplier.phone}`,
    });

    res.status(200).json({
      success: true,
      smsBatchId: result.smsBatchId,
      message: "Reminder sent",
    });
  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}