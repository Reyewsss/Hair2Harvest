// Tells an assigned staff member about a pickup by SMS and email.
// Never throws: a failed channel is reported back so the UI can say which one didn't go out.
import { transporter, mailFrom } from "../../auth/mailConfig/mailConfig.js";
import { sendSms } from "../utils/sms.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const timeLabel = (hhmm) => {
  const [h, m] = String(hhmm ?? "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return String(hhmm ?? "");
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const dateLabel = (ymd) => {
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? String(ymd)
    : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

function buildMessages({ staff, supplier, date, time, reason }) {
  const when = `${dateLabel(date)} at ${timeLabel(time)}`;
  const where = [supplier.street, supplier.barangay].filter(Boolean).join(", ");
  const lead = reason === "rescheduled" ? "Your pickup was rescheduled" : "You've been assigned a pickup";
  const first = String(staff.firstName || staff.name || "there").split(" ")[0];

  const sms = `Hair2Harvest: ${lead} - ${supplier.shopName}${where ? ` (${where})` : ""} on ${when}.${
    supplier.phone ? ` Shop contact: ${supplier.phone}.` : ""
  }`;

  const subject = `${reason === "rescheduled" ? "Pickup rescheduled" : "New pickup assigned"}: ${supplier.shopName}, ${dateLabel(date)}`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#41431b">
    <h2 style="margin:0 0 16px">Hair2Harvest</h2>
    <p>Hi ${escapeHtml(first)},</p>
    <p>${escapeHtml(lead)}:</p>
    <table style="font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#777">Shop</td><td><strong>${escapeHtml(supplier.shopName)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#777">When</td><td>${escapeHtml(when)}</td></tr>
      ${where ? `<tr><td style="padding:4px 12px 4px 0;color:#777">Address</td><td>${escapeHtml(where)}</td></tr>` : ""}
      ${supplier.owner ? `<tr><td style="padding:4px 12px 4px 0;color:#777">Owner</td><td>${escapeHtml(supplier.owner)}</td></tr>` : ""}
      ${supplier.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#777">Contact</td><td>${escapeHtml(supplier.phone)}</td></tr>` : ""}
    </table>
    <p style="color:#777;font-size:13px">Open Hair2Harvest to see your full schedule.</p>
  </div>`;
  const text = `Hi ${first},\n\n${lead}:\nShop: ${supplier.shopName}\nWhen: ${when}${where ? `\nAddress: ${where}` : ""}${
    supplier.phone ? `\nContact: ${supplier.phone}` : ""
  }\n`;
  return { sms, subject, html, text };
}

/**
 * @param {{ staff: object, supplier: object, date: string, time: string, reason: "assigned"|"rescheduled" }} input
 * @returns {Promise<{ sms: { sent: boolean, error?: string }, email: { sent: boolean, error?: string } }>}
 */
export async function notifyAssignedStaff(input) {
  const { staff } = input;
  const { sms, subject, html, text } = buildMessages(input);
  const result = { sms: { sent: false }, email: { sent: false } };

  // SMS
  if (!staff.phone) {
    result.sms.error = "No phone number on file for this staff member";
  } else {
    const r = await sendSms(staff.phone, sms);
    result.sms = r.success ? { sent: true } : { sent: false, error: r.error };
  }

  // Email
  try {
    // The optional reminder email wins over the login email.
    const to = staff.notifyEmail || staff.email;
    if (!to) {
      result.email.error = "No email on file for this staff member";
    } else if (!transporter) {
      if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
      console.log(`\n[dev] pickup email to ${to}: ${subject}\n`);
      result.email = { sent: true };
    } else {
      await transporter.sendMail({ from: mailFrom, to, subject, html, text });
      result.email = { sent: true };
    }
  } catch (error) {
    console.error("Staff pickup email failed:", error.message);
    result.email = { sent: false, error: error.message };
  }

  return result;
}
