// backend/src/modules/suppliers/utils/sms.js
// TextBee SMS gateway — sends through your own Android phone.
// Docs: https://textbee.dev/docs

const TEXTBEE_URL = "https://api.textbee.dev/api/v1/gateway/send-sms";

/**
 * Send an SMS via TextBee.
 * @param {string} to - Recipient phone (E.164 recommended, e.g. +639171234567)
 * @param {string} message - Message body
 * @returns {Promise<{ success: boolean, smsBatchId?: string, error?: string }>}
 */
export async function sendSms(to, message) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  if (!apiKey) {
    console.warn("TEXTBEE_API_KEY not set — SMS not sent");
    return { success: false, error: "SMS gateway not configured" };
  }

  // TextBee expects E.164 format. Convert PH local "09XXXXXXXXX" → "+639XXXXXXXXX"
  let recipient = String(to).replace(/\s/g, "");
  if (/^09\d{9}$/.test(recipient)) {
    recipient = "+63" + recipient.slice(1);
  } else if (/^9\d{9}$/.test(recipient)) {
    recipient = "+63" + recipient;
  }

  const body = {
    recipients: [recipient],
    message: message,
  };

  // Only include deviceId if you've set a specific one
  if (process.env.TEXTBEE_DEVICE_ID) {
    body.deviceId = process.env.TEXTBEE_DEVICE_ID;
  }

  try {
    const res = await fetch(TEXTBEE_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("TextBee send failed:", res.status, data);
      return {
        success: false,
        error: data?.error || data?.message || `HTTP ${res.status}`,
      };
    }

    // TextBee returns { data: { success, message, smsBatchId } }
    return {
      success: true,
      smsBatchId: data?.data?.smsBatchId,
    };
  } catch (err) {
    console.error("TextBee fetch error:", err.message);
    return { success: false, error: err.message };
  }
}