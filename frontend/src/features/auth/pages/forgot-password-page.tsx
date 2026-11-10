// features/auth/pages/forgot-password-page.tsx
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import Logo from "../../../assets/hair2harvest-logo.svg";
import { errorMessage } from "@/lib/api";
import { authApi } from "../auth-api";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setIsSubmitted(true);
    try {
      // The server answers the same whether or not the email has an account.
      await authApi.forgotPassword(email.trim());
      navigate("/verify-otp", {
        state: { email: email.trim().toLowerCase(), purpose: "reset" },
      });
    } catch (err) {
      setError(errorMessage(err));
      setIsSubmitted(false);
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
            Reset Password
          </h1>
          <p className="text-[13px] text-gray-500 mt-2">
            Enter your email address and we'll send you a code to reset your
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="email"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="username"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
              className="w-full px-4 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitted}
            className="w-full py-[13px] text-[15px] font-semibold text-[#F8F3E1] bg-[#41431B] rounded-lg transition-all duration-300 hover:bg-[#2a2b12] hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitted ? "Sending..." : "Send Reset Code"}
          </button>

          <Link
            to="/login"
            className="block text-center mt-4 text-[13px] font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B]"
          >
            Back to Sign In
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
