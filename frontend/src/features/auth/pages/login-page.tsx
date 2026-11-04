import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router";
import Logo from "../../../assets/hair2harvest-logo.svg";

const LoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login submitted:", formData);

    localStorage.setItem("isAuthenticated", "true");

    localStorage.setItem("userEmail", formData.email);
    localStorage.setItem("userPassword", formData.password);
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden font-poppins">
      {/* LOGIN CARD — scaled down by 10% */}
      <div className="relative z-10 w-full max-w-[405px] bg-white p-9 rounded-2xl mx-5">
        <div className="text-center mb-7 flex flex-col items-center">
          <img
            src={Logo}
            alt="Company Logo"
            className="w-[80px] h-[80px] object-contain mb-3"
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Input */}
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
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
            />
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block mb-2 text-[13px] font-medium text-[#41431B]"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-[11px] text-[13px] text-[#41431B] bg-white border-2 border-[#E3DBBB] rounded-lg outline-none transition-all duration-300 focus:border-[#AEB784] focus:ring-1 focus:ring-[#AEB784] placeholder:text-gray-400 placeholder:font-light"
            />
          </div>

          {/* Options Row */}
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

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full py-[13px] text-[15px] font-semibold text-[#F8F3E1] bg-[#41431B] rounded-lg transition-all duration-300 hover:bg-[#2a2b12] hover:shadow-lg active:scale-[0.98]"
          >
            Sign In
          </button>

          {/* Forgot Password Link */}
          <a
            href="/forgot-password"
            className="block text-center mt-4 text-[13px] font-medium text-[#AEB784] transition-colors duration-300 hover:text-[#41431B]"
          >
            Forgot Password?
          </a>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
