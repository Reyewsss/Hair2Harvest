import { transporter, mailFrom } from "./mailConfig.js";
import { current } from "../../security/securitySettings.js";
import { failedAttemptsEmail, otpEmail } from "./emailTemplates.js";

export async function sendOtpEmail({ to, name, code, purpose }) {
  const { subject, html, text } = otpEmail({ name, code, purpose, minutes: current().otpTtlMinutes });

  if (!transporter) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    // Development convenience only: no email server needed to test the flow.
    console.log(`\n[dev] ${purpose} code for ${to}: ${code}\n`);
    return;
  }
  await transporter.sendMail({ from: mailFrom, to, subject, html, text });
}
export async function sendFailedAttemptsEmail({ to, name, attempts, lockoutSeconds }) {
  const { subject, html, text } = failedAttemptsEmail({ name, attempts, lockoutSeconds });

  if (!transporter) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    console.log(`
[dev] ${attempts.length} failed sign-ins for ${to}; lockout email not sent (no SMTP)
`);
    return;
  }
  await transporter.sendMail({ from: mailFrom, to, subject, html, text });
}
