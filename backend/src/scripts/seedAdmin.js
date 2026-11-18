// Creates the first administrator from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD. Run: npm run seed:admin
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../modules/auth/authModel.js";
import { EMAIL_RE, validatePassword } from "../modules/auth/utils/passwordPolicy.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

try {
  if (!ADMIN_NAME || !EMAIL_RE.test(String(ADMIN_EMAIL))) throw new Error("Set ADMIN_NAME and a valid ADMIN_EMAIL in .env");
  const problem = validatePassword(ADMIN_PASSWORD);
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);

  await connectDB();
  if (await User.exists({ role: "admin" })) {
    console.log("An administrator already exists. Nothing to do.");
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" });
    console.log(`Administrator created: ${ADMIN_EMAIL}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}