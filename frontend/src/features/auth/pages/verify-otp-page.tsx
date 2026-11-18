// features/auth/pages/verify-otp-page.tsx
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router";
import Logo from "../../../assets/hair2harvest-logo.svg";
import { errorMessage } from "@/lib/api";
import { authApi } from "../auth-api";
import type { OtpPurpose } from "../auth-api";
import { useAuth } from "../context/auth-context";

const RESEND_SECONDS = 60;

type LocationState = {
  email?: string;
  purpose?: OtpPurpose; // "login" for admin/staff sign-in, "reset" for a password reset
  rememberMe?: boolean;
} | null;

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyLoginOtp } = useAuth();

  const state = location.state as LocationState;
  const email = state?.email ?? "";
  const purpose = state?.purpose;
  const rememberMe = state?.rememberMe ?? false;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Opened directly (no email in the navigation state): start over.
  if (!email || !purpose) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Enter the 6-digit code.");

    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (purpose === "login") {
        await verifyLoginOtp(email, otp, rememberMe); // sets the session
        navigate("/dashboard", { replace: true });
      } else {
        const { resetToken } = await authApi.verifyResetOtp(email, otp);
        navigate("/reset-password", { state: { email, resetToken } });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await authApi.resendOtp(email, purpose);
      setInfo("A new code is on its way.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden font-poppins">
      <div className="relative z-10 w-full max-w-[405px] bg-white p-9 rounded-2xl mx-5">
        <div className="text-center mb-7 flex flex-col items-center">
          <img
            src={Logo}
            alt="Company Logo"
            className="w-[80px] h-[80px] object-contain mb-3"
          />
          <h1 className="text-xl font-semibold text-[#41431B]">
            Check your email
          </h1>
          <p className="text-[13px] text-gray-500 mt-2">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-[#41431B]">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="otp"
              className="block mb-2 text-[13px] font-medium text-[#41431B] text-center"
            >
              Enter Verification Code
            </label>
            <input
              type="text"
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "")); // Only allow numbers
                if (error) setError("");
              }}
              required
              className="w-full px-4 py-[11px] text-lg text-center tracking-[0.5em] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-300 placeholder:tracking-normal"
            />
          </div>

          {/* Info and error messages */}
          {info && (
            <div className="mb-4 p-3 bg-[#F5FFDB] border border-[#E3DBBB] rounded-lg">
              <p className="text-[12px] text-[#41431B] text-center">{info}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-[13px] text-[15px] font-semibold text-[#F8F3E1] bg-[#41431B] rounded-lg transition-all duration-300 hover:bg-[#2a2b12] hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
          >
            {busy
              ? "Verifying..."
              : purpose === "login"
                ? "Verify and Sign In"
                : "Verify Code"}
          </button>

          <div className="flex justify-between items-center mt-5 text-[13px]">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B] disabled:opacity-60 disabled:hover:text-[#AEB784]"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <Link
              to="/login"
              className="font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
