import {
	PASSWORD_RESET_REQUEST_TEMPLATE,
	PASSWORD_RESET_SUCCESS_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
import { transporter, sender } from "./mailConfig.js";

// Escape user-supplied text before putting it into HTML
const escapeHtml = (str = "") =>
	String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const sendVerificationEmail = async (email, verificationToken) => {
	try {
		const info = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Verify your email",
			html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", () => verificationToken),
		});

		console.log("Verification email sent:", info.messageId);
	} catch (error) {
		console.error("Error sending verification email", error);
		throw new Error(`Error sending verification email: ${error}`);
	}
};

export const sendWelcomeEmail = async (email, name) => {
	try {
		const info = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Welcome to Auth Company",
			html: WELCOME_EMAIL_TEMPLATE.replace("{name}", () => escapeHtml(name)).replace(
				"{companyName}",
				() => "Auth Company"
			),
		});

		console.log("Welcome email sent:", info.messageId);
	} catch (error) {
		console.error("Error sending welcome email", error);
		throw new Error(`Error sending welcome email: ${error}`);
	}
};

export const sendPasswordResetEmail = async (email, resetURL) => {
	try {
		const info = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", () => resetURL),
		});

		console.log("Password reset email sent:", info.messageId);
	} catch (error) {
		console.error("Error sending password reset email", error);
		throw new Error(`Error sending password reset email: ${error}`);
	}
};

export const sendResetSuccessEmail = async (email) => {
	try {
		const info = await transporter.sendMail({
			from: sender,
			to: email,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
		});

		console.log("Password reset success email sent:", info.messageId);
	} catch (error) {
		console.error("Error sending password reset success email", error);
		throw new Error(`Error sending password reset success email: ${error}`);
	}
};