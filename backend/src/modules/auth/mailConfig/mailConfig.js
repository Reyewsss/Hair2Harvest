import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.SMTP_PORT) || 465;

export const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || "smtp.gmail.com",
	port,
	secure: port === 465, // 465 = SSL, 587 = STARTTLS (secure must be false)
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD, // 16-char Google App Password, NOT your normal password
	},
});

export const sender = {
	name: "Jm Reyes",
	address: process.env.GMAIL_USER,
};