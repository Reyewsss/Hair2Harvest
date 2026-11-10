import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimiter.js";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "./middleware/verifyToken.js";
import { forgotPassword, login, logout, me, resendOtp, resetPassword, verifyOtp } from "./authController.js";

const router = Router();

// There is deliberately no public sign-up route. Administrators create accounts.
router.post("/login", authRateLimit, h(login));
router.post("/verify-otp", authRateLimit, h(verifyOtp));
router.post("/resend-otp", authRateLimit, h(resendOtp));
router.post("/forgot-password", authRateLimit, h(forgotPassword));
router.post("/reset-password", authRateLimit, h(resetPassword));
router.post("/logout", logout);
router.get("/me", h(verifyToken), me);

export default router;