import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { Readable } from "stream";
import { put, get, del } from "@vercel/blob";

/*
 * Consent PDFs are personal data, so they are never served publicly.
 * - With a Vercel Blob store connected (BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID): stored as PRIVATE Vercel Blobs.
 *   The DB keeps the blob URL.
 * - Without it (local dev): stored on disk under ./uploads/consent_forms.
 *   The DB keeps "uploads/consent_forms/<file>".
 * Either way they are read back only through GET /api/suppliers/:id/consent (login required).
 */
// A connected Blob store provides either BLOB_READ_WRITE_TOKEN or, on newer projects, BLOB_STORE_ID
// (the SDK then signs in with the deployment's OIDC token, no secret needed).
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_ROOT = path.join(process.cwd(), "uploads");
const isBlobRef = (stored) => /^https?:\/\//.test(stored);
// Only resolve paths inside ./uploads, so a bad DB value can't read or delete other files.
const localPath = (stored) => {
  const full = path.resolve(LOCAL_ROOT, path.relative("uploads", stored));
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid document path");
  return full;
};

// Keep the file in memory; the 5MB limit bounds memory use.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF documents are allowed"), false);
  },
});

/** Saves an uploaded consent PDF and returns the reference to store in the DB. */
export const saveConsentDocument = (file) => saveStoredFile(file, "consent_forms", "pdf");

/** Saves a private upload under uploads/<folder> (or a private Vercel Blob) and returns its reference. */
export async function saveStoredFile(file, folder, ext) {
  const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  if (useBlob()) {
    const blob = await put(`${folder}/${name}`, file.buffer, {
      access: "private",
      contentType: file.mimetype,
      addRandomSuffix: true,
    });
    return blob.url;
  }
  if (process.env.VERCEL) {
    // Vercel's disk is read-only and wiped between requests, so never fall back to it there.
    throw new Error(
      "File storage isn't configured. Connect a Vercel Blob store to the backend project (sets BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN) and redeploy.",
    );
  }
  const stored = `uploads/${folder}/${name}`;
  await fs.mkdir(path.dirname(localPath(stored)), { recursive: true });
  await fs.writeFile(localPath(stored), file.buffer);
  return stored;
}

/** Returns a Node readable stream of the stored PDF, or null if it no longer exists. */
export async function openConsentDocument(stored) {
  if (isBlobRef(stored)) {
    const result = await get(stored, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return Readable.fromWeb(result.stream);
  }
  try {
    const full = localPath(stored);
    await fs.access(full);
    const { createReadStream } = await import("fs");
    return createReadStream(full);
  } catch {
    return null;
  }
}

/** Deletes a stored PDF. Never throws; a leftover file shouldn't block deleting the supplier. */
export async function deleteConsentDocument(stored) {
  try {
    if (isBlobRef(stored)) await del(stored);
    else await fs.unlink(localPath(stored));
  } catch (error) {
    console.error("Could not delete consent document:", error.message);
  }
}
