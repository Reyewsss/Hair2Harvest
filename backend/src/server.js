import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { rateLimit } from "./middleware/rateLimiter.js";
import authRoutes from "./modules/auth/authRoutes.js";
import accountsRoutes from "./modules/accounts/accountsRoutes.js";
import supplierRoutes from "./modules/suppliers/supplierRoutes.js";
import auditRoutes from "./modules/audit/auditRoutes.js"; 

for (const name of ["JWT_SECRET", "OTP_SECRET", "CLIENT_URL"]) {
  if (!process.env[name]) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
}

const app = express();
app.set("trust proxy", 1); // so rate limiting sees the real client IP behind a proxy

// Serve uploaded files (PDFs)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL.split(",").map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", rateLimit);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/suppliers", supplierRoutes); 
app.use("/api/audit", auditRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

// Errors from async handlers arrive here through asyncHandler.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT) || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`API listening on http://localhost:${port}`)))
  .catch((error) => {
    console.error("Could not start:", error.message);
    process.exit(1);
  });