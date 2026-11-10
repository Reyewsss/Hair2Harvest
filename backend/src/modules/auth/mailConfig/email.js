import { transporter, mailFrom } from "./mailConfig.js";
import { otpEmail } from "./emailTemplates.js";

export async function sendOtpEmail({ to, name, code, purpose }) {
  const { subject, html, text } = otpEmail({ name, code, purpose });

  if (!transporter) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    // Development convenience only: no email server needed to test the flow.
    console.log(`\n[dev] ${purpose} code for ${to}: ${code}\n`);
    return;
  }
  await transporter.sendMail({ from: mailFrom, to, subject, html, text });
}