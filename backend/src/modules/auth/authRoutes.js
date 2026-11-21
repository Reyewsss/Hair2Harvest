import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimiter.js";
import { asyncHandler as h } from "../../middleware/asyncHandler.js";
import { verifyToken } from "./middleware/verifyToken.js";
import { forgotPassword, login, logout, me, resendOtp, resetPassword, verifyOtp } from "./authController.js";
import { changePassword, myActivity, updateProfile } from "./profileController.js";

const router = Router();

// There is deliberately no public sign-up route. Administrators create accounts.
router.post("/login", authRateLimit, h(login));
router.post("/verify-otp", authRateLimit, h(verifyOtp));
router.post("/resend-otp", authRateLimit, h(resendOtp));
router.post("/forgot-password", authRateLimit, h(forgotPassword));
router.post("/reset-password", authRateLimit, h(resetPassword));
router.post("/logout", logout);
router.get("/me", h(verifyToken), me);

// Self-service profile (the signed-in user only).
router.patch("/profile", h(verifyToken), h(updateProfile));
router.post("/change-password", authRateLimit, h(verifyToken), h(changePassword));
router.get("/activity", h(verifyToken), h(myActivity));

export default router;