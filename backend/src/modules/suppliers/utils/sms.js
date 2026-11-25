// backend/src/modules/suppliers/utils/sms.js
// TextBee SMS gateway — sends through your own Android phone.
// Docs: https://textbee.dev/docs/api-reference (POST /gateway/send-sms)

// POST /gateway/send-sms: current endpoint per https://textbee.dev/docs/api-reference.
// TEXTBEE_API_URL overrides the base URL for a self-hosted TextBee server.
const textbeeUrl = () =>
  `${(process.env.TEXTBEE_API_URL?.trim() || "https://api.textbee.dev/api/v1").replace(/\/+$/, "")}/gateway/send-sms`;

/**
 * Normalises a PH number to E.164 (+639XXXXXXXXX). Accepts spaces, dashes, dots and
 * parentheses, plus the 09…, 9…, 639… and +639… forms. Returns null if it isn't a PH mobile.
 */
export function toE164(phone) {
  const digits = String(phone ?? "").replace(/[\s\-().]/g, "");
  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return "+" + digits;
  if (/^09\d{9}$/.test(digits)) return "+63" + digits.slice(1);
  if (/^9\d{9}$/.test(digits)) return "+63" + digits;
  return null;
}

/**
 * Send an SMS via TextBee.
 * @param {string} to - Recipient phone (PH mobile in any common format)
 * @param {string} message - Message body
 * @returns {Promise<{ success: boolean, smsBatchId?: string, error?: string }>}
 */
export async function sendSms(to, message) {
  const apiKey = process.env.TEXTBEE_API_KEY?.trim();
  if (!apiKey) {
    console.warn("TEXTBEE_API_KEY not set — SMS not sent");
    return { success: false, error: "SMS gateway not configured" };
  }

  const recipient = toE164(to);
  if (!recipient) {
    return { success: false, error: `"${to}" is not a valid PH mobile number` };
  }

  // Keep the text in the plain GSM alphabet: a single "–" or curly quote switches the whole
  // SMS to Unicode (70 chars/part), turning one text into a 3-part message that some SIMs fail on.
  const plain = String(message)
    .replace(/[–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ");

  const body = { recipients: [recipient], message: plain };
  if (process.env.TEXTBEE_DEVICE_ID?.trim()) body.deviceId = process.env.TEXTBEE_DEVICE_ID.trim();
  // Optional SIM to send from: 0 = SIM 1, 1 = SIM 2 (omit to use the phone's default SIM).
  const slot = Number.parseInt(process.env.TEXTBEE_SIM_SLOT ?? "", 10);
  if (Number.isInteger(slot) && slot >= 0 && slot <= 7) body.simSlotIndex = slot;

  try {
    const res = await fetch(textbeeUrl(), {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    // Error pages aren't always JSON.
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("TextBee send failed:", res.status, data);
      const reason =
        res.status === 401 ? "Invalid TextBee API key"
        : res.status === 429 ? "TextBee plan limit reached"
        : data?.error || data?.message || `HTTP ${res.status}`;
      return { success: false, error: reason };
    }

    // TextBee returns { data: { success, message, smsBatchId, warning? } }
    const result = data?.data ?? {};
    if (result.success === false) {
      return { success: false, error: result.message || "TextBee rejected the message" };
    }
    if (result.warning) console.warn("TextBee warning:", result.warning);

    return { success: true, smsBatchId: result.smsBatchId };
  } catch (err) {
    console.error("TextBee fetch error:", err.message);
    return { success: false, error: err.name === "TimeoutError" ? "SMS gateway timed out" : err.message };
  }
}
