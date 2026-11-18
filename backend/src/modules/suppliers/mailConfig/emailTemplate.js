// backend/src/config/email-templates.js

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function supplierRegisteredEmail({
  firstName,
  shopName,
  shopCode,
  barangay,
  consentVersion,
}) {
  const subject = `Welcome to Hair2Harvest — ${shopName} is registered`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#41431b">
    <h2 style="margin:0 0 16px">Hair2Harvest</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Welcome aboard! <strong>${escapeHtml(shopName)}</strong> is now registered as a hair waste contributor in ${escapeHtml(barangay)}. Your shop code is:</p>
    <p style="font-size:32px;letter-spacing:8px;font-weight:700;background:#f5ffdb;padding:16px;text-align:center;border-radius:8px">${escapeHtml(shopCode)}</p>
    <p style="margin:0 0 4px;font-size:14px"><strong>Consent version:</strong> ${escapeHtml(consentVersion)}</p>
    <p>Our team will contact you to confirm your pickup schedule. Please keep your consent PDF on file, as it's required for compliance.</p>
    <p style="color:#777;font-size:13px">If you didn't expect this email, tell an administrator so we can correct the registration.</p>
    <p style="color:#777;font-size:13px">Thank you for helping us turn hair waste into compost.<br/>— The Hair2Harvest Team</p>
  </div>`;

  const text = `Hi ${firstName},

Welcome to Hair2Harvest! ${shopName} is now registered as a hair waste contributor in ${barangay}.

Shop code: ${shopCode}
Consent version: ${consentVersion}

Our team will contact you to confirm your pickup schedule. Please keep your consent PDF on file.
If you didn't expect this email, tell an administrator.

— The Hair2Harvest Team`;

  return { subject, html, text };
}