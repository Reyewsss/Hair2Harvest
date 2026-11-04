import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// A machine-specific .env.local takes precedence over .env. Loaded here with
// override:true because other modules read .env at import time.
const localEnv = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv, override: true });
  console.log('Using database settings from .env.local');
}

// Function to connect to MongoDB using Mongoose
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully");
    return mongoose;
  } catch (err) {
    // Keep the process alive: the UI and non-database routes stay usable while
    // the database is unreachable (offline dev, DNS or IP allowlist problems).
    console.error("Error connecting to MongoDB:", err.message);
    console.error("Server is running without a database connection.");
    return null;
  }
}
