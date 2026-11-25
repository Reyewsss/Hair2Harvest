import mongoose from "mongoose";
import multer from "multer";
import path from "node:path";
import { User } from "../auth/authModel.js";
import { recordAudit } from "../audit/auditController.js";
import { deleteConsentDocument, openConsentDocument, saveStoredFile } from "../suppliers/uploadConfig.js";

// A staff ID can be a photo or a PDF, up to 5 MB. Kept in memory until it is stored.
const TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
const MIME = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };

export const uploadId = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    TYPES[file.mimetype] ? cb(null, true) : cb(new Error("The ID must be a PDF, JPG or PNG file."), false),
}).single("idDocument");

// Turns multer errors (wrong type, too big) into a normal 400 instead of a 500.
export const handleIdUpload = (req, res, next) =>
  uploadId(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE" ? "The ID file must be 5 MB or smaller." : error.message;
    res.status(400).json({ message });
  });

const findUser = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Account not found." });
    return null;
  }
  const user = await User.findById(req.params.id);
  if (!user) res.status(404).json({ message: "Account not found." });
  return user;
};

export const setIdDocument = async (req, res) => {
  const user = await findUser(req, res);
  if (!user) return;
  if (!req.file) return res.status(400).json({ message: "Choose an ID file to upload." });

  const previous = user.idDocument;
  user.idDocument = await saveStoredFile(req.file, "staff_ids", TYPES[req.file.mimetype]);
  await user.save();
  if (previous) await deleteConsentDocument(previous);

  await recordAudit({
    req,
    action: "update",
    module: "accounts",
    item: `${user.name} (${user.email})`,
    itemId: user._id.toString(),
    remarks: previous ? "ID document replaced" : "ID document uploaded",
  });
  res.json({ account: user.toSafeJSON() });
};

export const getIdDocument = async (req, res) => {
  const user = await findUser(req, res);
  if (!user) return;
  const stream = user.idDocument ? await openConsentDocument(user.idDocument) : null;
  if (!stream) return res.status(404).json({ message: "No ID on file for this account." });

  const ext = path.extname(user.idDocument.split("?")[0]).slice(1).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="id-${user._id}.${ext || "bin"}"`);
  res.setHeader("Cache-Control", "private, no-store");
  stream.on("error", (error) => {
    console.error("Error streaming ID document:", error);
    res.destroy(error);
  });
  stream.pipe(res);
};

export const removeIdDocument = async (req, res) => {
  const user = await findUser(req, res);
  if (!user) return;
  if (!user.idDocument) return res.status(404).json({ message: "No ID on file for this account." });

  await deleteConsentDocument(user.idDocument);
  user.idDocument = undefined;
  await user.save();

  await recordAudit({
    req,
    action: "update",
    module: "accounts",
    item: `${user.name} (${user.email})`,
    itemId: user._id.toString(),
    remarks: "ID document removed",
  });
  res.json({ account: user.toSafeJSON() });
};
