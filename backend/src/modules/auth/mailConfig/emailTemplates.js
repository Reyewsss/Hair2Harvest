const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const copy = {
  login: { subject: "Your Hair2Harvest sign-in code", intro: "Use this code to finish signing in:" },
  reset: { subject: "Your Hair2Harvest password reset code", intro: "Use this code to reset your password:" },
};

export function failedAttemptsEmail({ name, attempts, lockoutSeconds }) {
  const subject = "Hair2Harvest: failed sign-in attempts on your account";
  const rows = attempts.map((a) => ({
    when: new Date(a.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" }),
    ip: a.ip || "unknown",
    device: a.userAgent || "unknown",
  }));
  const li = rows
    .map((r) => `<li>${escapeHtml(r.when)} &middot; IP ${escapeHtml(r.ip)} &middot; ${escapeHtml(r.device)}</li>`)
    .join("");
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#41431b">
    <h2 style="margin:0 0 16px">Hair2Harvest</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>There were ${rows.length} failed attempts to sign in to your account. Sign-in is locked for ${lockoutSeconds} seconds.</p>
    <ul style="padding-left:18px;font-size:13px">${li}</ul>
    <p style="color:#777;font-size:13px">If this was you, wait and try again. If not, someone may be guessing your password: change it and tell an administrator.</p>
  </div>`;
  const text = `Hi ${name},

${rows.length} failed sign-in attempts. Sign-in is locked for ${lockoutSeconds} seconds.

${rows
    .map((r) => `${r.when} - IP ${r.ip} - ${r.device}`)
    .join("\n")}

If this wasn't you, change your password and tell an administrator.`;
  return { subject, html, text };
}

export function otpEmail({ name, code, purpose, minutes }) {
  const { subject, intro } = copy[purpose];
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#41431b">
    <h2 style="margin:0 0 16px">Hair2Harvest</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>${intro}</p>
    <p style="font-size:32px;letter-spacing:8px;font-weight:700;background:#f5ffdb;padding:16px;text-align:center;border-radius:8px">${code}</p>
    <p>This code expires in ${minutes} minutes and can be used once.</p>
    <p style="color:#777;font-size:13px">If you didn't ask for this, someone may know your password. Tell an administrator and change it.</p>
  </div>`;
  const text = `Hi ${name},
\n${intro} ${code}\n\nThis code expires in ${minutes} minutes and can be used once.\nIf you didn't ask for this, tell an administrator.`;
  return { subject, html, text };
}