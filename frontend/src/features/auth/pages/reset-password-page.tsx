// features/auth/components/reset-password-page.tsx
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import Logo from "../../../assets/hair2harvest-logo.svg";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Grab the email from the previous step (if available)
  const email = location.state?.email || "your email";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing again
    if (error) setError("");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    console.log("Password successfully reset for:", email);

    // In a real app, you would send the new password to your backend here.
    // Then navigate back to login
    navigate("/login");
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
          {/* New Password */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-5">
            <label
              htmlFor="confirmPassword"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            className="w-full py-[13px] text-[15px] font-semibold text-[#F8F3E1] bg-[#41431B] rounded-lg transition-all duration-300 hover:bg-[#2a2b12] hover:shadow-lg active:scale-[0.98]"
          >
            Reset Password
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
