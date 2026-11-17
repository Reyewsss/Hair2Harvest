// backend/src/config/email-templates.js

export function supplierRegisteredEmail({
  firstName,
  shopName,
  shopCode,
  barangay,
  consentVersion,
}) {
  const subject = `Welcome to Hair2Harvest — ${shopName} is registered`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="color:#2563eb;margin-bottom:4px">Welcome to Hair2Harvest 🌱</h2>
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>
      Your shop <strong>${shopName}</strong> has been successfully registered
      as a hair waste contributor in <strong>${barangay}</strong>.
    </p>
    <table style="border-collapse:collapse;margin:12px 0;font-size:14px">
      <tr><td style="padding:4px 8px;color:#555">Shop code</td><td style="padding:4px 8px"><strong>${shopCode}</strong></td></tr>
      <tr><td style="padding:4px 8px;color:#555">Consent version</td><td style="padding:4px 8px">${consentVersion}</td></tr>
    </table>
    <p>
      Our team will contact you to confirm your pickup schedule. Please keep
      your consent PDF on file — it's required for compliance.
    </p>
    <p style="margin-top:24px;font-size:13px;color:#666">
      Thank you for helping us turn hair waste into compost.<br/>
      — The Hair2Harvest Team
    </p>
  </div>`;

  const text = `Hi ${firstName},

Your shop ${shopName} has been successfully registered with Hair2Harvest (shop code: ${shopCode}, consent ${consentVersion}).

Our team will contact you to confirm your pickup schedule.

— The Hair2Harvest Team`;

  return { subject, html, text };
}