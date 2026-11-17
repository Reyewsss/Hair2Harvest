const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const copy = {
  login: { subject: "Your Hair2Harvest sign-in code", intro: "Use this code to finish signing in:" },
  reset: { subject: "Your Hair2Harvest password reset code", intro: "Use this code to reset your password:" },
};

export function otpEmail({ name, code, purpose, minutes = 10 }) {
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
  const text = `Hi ${name},\n\n${intro} ${code}\n\nThis code expires in ${minutes} minutes and can be used once.\nIf you didn't ask for this, tell an administrator.`;
  return { subject, html, text };
}