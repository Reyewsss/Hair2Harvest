// features/auth/pages/reset-password-page.tsx
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router";
import { Eye, EyeOff } from "lucide-react"; // 👈 Added import
import Logo from "../../../assets/hair2harvest-logo.svg";
import { errorMessage } from "@/lib/api";
import { authApi } from "../auth-api";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    email?: string;
    resetToken?: string;
  } | null;
  const resetToken = state?.resetToken;

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 👈 Added state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  if (!resetToken) return <Navigate to="/forgot-password" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { password, confirmPassword } = formData;

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      setError("Use both uppercase and lowercase letters.");
      return;
    }
    if (!/\d/.test(password)) {
      setError("Include at least one number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await authApi.resetPassword(resetToken, password);
      navigate("/login", {
        replace: true,
        state: { notice: "Password updated. Sign in with your new password." },
      });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
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
            Create New Password
          </h1>
          <p className="text-[13px] text-gray-500 mt-2">
            Your new password must be different from previously used passwords.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              New Password
            </label>
            {/* 👈 Wrapped input and button in relative container */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter new password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-4 pr-11 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#41431B] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-gray-500">
              At least 8 characters, with upper and lowercase letters and a
              number.
            </p>
          </div>

          <div className="mb-5">
            <label
              htmlFor="confirmPassword"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              Confirm New Password
            </label>
            {/* 👈 Wrapped input and button in relative container */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-4 pr-11 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#41431B] transition-colors"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

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
            {busy ? "Updating..." : "Reset Password"}
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

export default ResetPasswordPage;
