// Place at: src/lib/file-validation.ts  (imported as "@/lib/file-validation")

export interface FileRule {
  /** Max size in bytes. */
  maxBytes: number;
  /** Allowed MIME types. */
  mimeTypes: string[];
  /** Allowed extensions (lowercase, no dot) - checked as well as MIME. */
  extensions: string[];
  /** Human label for messages, e.g. "photo" or "consent document". */
  label: string;
}

export const MB = 1024 * 1024;

export const PHOTO_RULE: FileRule = {
  maxBytes: 5 * MB,
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
  label: "photo",
};

export const DOCUMENT_RULE: FileRule = {
  maxBytes: 5 * MB,
  mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  extensions: ["pdf", "jpg", "jpeg", "png"],
  label: "document",
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(file: File, rule: FileRule): string | null {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  const allowedList = rule.extensions.map((e) => e.toUpperCase()).join(", ");

  if (file.size === 0) {
    return `The selected ${rule.label} is empty. Please choose another file.`;
  }
  // Some devices report an empty MIME type, so accept a valid extension then.
  const typeOk = file.type
    ? rule.mimeTypes.includes(file.type.toLowerCase())
    : rule.extensions.includes(ext);
  if (!typeOk || !rule.extensions.includes(ext)) {
    return `Unsupported file type${ext ? ` (.${ext})` : ""}. Allowed: ${allowedList}.`;
  }
  if (file.size > rule.maxBytes) {
    return `The ${rule.label} is ${formatBytes(file.size)}. The limit is ${formatBytes(rule.maxBytes)}.`;
  }
  return null;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales a photo and re-encodes it as JPEG so it stays small enough to
 * send as base64 in a JSON body (phone photos are often 3-8 MB).
 * Falls back to the original file if the browser can't decode it (e.g. HEIC).
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.8,
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return readAsDataUrl(file);
  }
}