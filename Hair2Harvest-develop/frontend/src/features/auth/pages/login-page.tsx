import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react"; // 👈 Added import
import Logo from "../../../assets/hair2harvest-logo.svg";
import { errorMessage } from "@/lib/api";
import { useAuth } from "../context/auth-context";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const notice = (location.state as { notice?: string } | null)?.notice ?? "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 👈 Added state for password visibility
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await login(
        formData.email.trim(),
        formData.password,
        formData.rememberMe,
      );
      if (result.otpRequired) {
        navigate("/verify-otp", {
          state: {
            email: result.email,
            purpose: "login",
            rememberMe: formData.rememberMe,
          },
        });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
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
        </div>

        <form onSubmit={handleSubmit}>
          {notice && (
            <div className="mb-4 p-3 bg-[#F5FFDB] border border-[#E3DBBB] rounded-lg">
              <p className="text-[12px] text-[#41431B] text-center">{notice}</p>
            </div>
          )}

          <div className="mb-4">
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
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              Password
            </label>
            {/* 👈 Wrapped input and button in relative container */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-4 pr-11 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
              />
              {/* 👈 Toggle button */}
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
          </div>

          <div className="flex justify-between items-center mb-5 text-[13px]">
            <label className="flex items-center text-[#41431B] cursor-pointer hover:text-[#AEB784] transition-colors font-medium">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-[15px] h-[15px] mr-2 cursor-pointer accent-[#41431B]"
              />
              Remember me
            </label>
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
            {busy ? "Signing in..." : "Sign In"}
          </button>

          <Link
            to="/forgot-password"
            className="block text-center mt-4 text-[13px] font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B]"
          >
            Forgot Password?
          </Link>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
