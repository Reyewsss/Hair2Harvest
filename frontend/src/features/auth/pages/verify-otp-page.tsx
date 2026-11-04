// features/auth/components/verify-otp-page.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import Logo from "../../../assets/hair2harvest-logo.svg";

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "your email";

  const [otp, setOtp] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Verifying OTP:", otp);

    // Simulate successful OTP verification
    // In a real app, you would call your backend here, then route to a "New Password" page.
    navigate("/reset-password", { state: { email, otp } });
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
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // Only allow numbers
              required
              className="w-full px-4 py-[11px] text-lg text-center tracking-[0.5em] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-300 placeholder:tracking-normal"
            />
          </div>

          <button
            type="submit"
            className="w-full py-[13px] text-[15px] font-semibold text-[#F8F3E1] bg-[#41431B] rounded-lg transition-all duration-300 hover:bg-[#2a2b12] hover:shadow-lg active:scale-[0.98]"
          >
            Verify Code
          </button>

          <div className="flex justify-between items-center mt-5 text-[13px]">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B]"
            >
              Resend code
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
