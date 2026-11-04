import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

/* Quick database check: connects with the MONGO_URI from .env, then reports
   which collections exist and how many documents each holds.
   Run with: npm run db:check */

const COLLECTIONS = [
  "users",
  "suppliers",
  "batches",
  "pickups",
  "weightlogs",
  "labresults",
  "qualitythresholds",
  "qualitydecisions",
  "qualitystatushistories",
  "experiments",
  "growthlogs",
];

const hintFor = (error) => {
  const message = String(error?.message ?? "");
  if (message.includes("querySrv") || message.includes("ECONNREFUSED")) {
    return "DNS lookup failed — this network cannot resolve the Atlas hostname. Check your internet connection or DNS, then retry.";
  }
  if (/bad auth|Authentication failed|SCRAM/i.test(message)) {
    return "Atlas rejected the username or password. Check the credentials in MONGO_URI.";
  }
  if (/ETIMEDOUT|Could not connect|Server selection timed out/i.test(message)) {
    return "Could not reach the cluster. This is usually the Atlas IP allowlist — add your current IP under Network Access.";
  }
  if (message.includes("ENOTFOUND")) {
    return "Hostname not found. Check the cluster address in MONGO_URI.";
  }
  return "See the error message above.";
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  const safeUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:••••@");
  console.log("Connecting to:", safeUri);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    console.error("\nConnection failed:", error.message);
    console.error("Hint:", hintFor(error));
    process.exit(1);
  }

  console.log("Connected to:", mongoose.connection.host);
  console.log("Database:    ", mongoose.connection.name, "\n");

  const db = mongoose.connection.db;
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  const missing = [];

  console.log("Collection                 Documents");
  console.log("-------------------------------------");
  for (const name of COLLECTIONS) {
    if (!existing.includes(name)) {
      missing.push(name);
      console.log(`${name.padEnd(26)} (missing)`);
      continue;
    }
    const count = await db.collection(name).countDocuments();
    console.log(`${name.padEnd(26)} ${count}`);
  }

  const users = existing.includes("users")
    ? await db.collection("users").find({}, { projection: { email: 1 } }).toArray()
    : [];

  if (users.length) {
    console.log("\nAccounts:", users.map((user) => user.email).join(", "));
  }

  const empty = [];
  for (const name of COLLECTIONS) {
    if (!existing.includes(name)) continue;
    const count = await db.collection(name).countDocuments();
    if (count === 0) empty.push(name);
  }

  console.log("");
  if (missing.length || empty.length) {
    console.log(
      "Some data is missing. Run `npm run seed` to load the demo dataset.",
    );
  } else {
    console.log("Database looks healthy.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

main();
