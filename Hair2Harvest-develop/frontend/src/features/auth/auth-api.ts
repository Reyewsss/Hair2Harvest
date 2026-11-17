import { api } from "@/lib/api";
import type { Role } from "./permissions";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type OtpPurpose = "login" | "reset";

export type LoginResult = { otpRequired: true; email: string } | { otpRequired?: false; user: AuthUser };

export const authApi = {
  me: () => api<{ user: AuthUser }>("/auth/me"),
  login: (email: string, password: string, rememberMe: boolean) =>
    api<LoginResult>("/auth/login", { body: { email, password, rememberMe } }),
  verifyLoginOtp: (email: string, code: string, rememberMe: boolean) =>
    api<{ user: AuthUser }>("/auth/verify-otp", { body: { email, code, purpose: "login", rememberMe } }),
  verifyResetOtp: (email: string, code: string) =>
    api<{ resetToken: string }>("/auth/verify-otp", { body: { email, code, purpose: "reset" } }),
  resendOtp: (email: string, purpose: OtpPurpose) => api<{ message: string }>("/auth/resend-otp", { body: { email, purpose } }),
  forgotPassword: (email: string) => api<{ message: string }>("/auth/forgot-password", { body: { email } }),
  resetPassword: (resetToken: string, newPassword: string) =>
    api<{ message: string }>("/auth/reset-password", { body: { resetToken, newPassword } }),
  logout: () => api<{ message: string }>("/auth/logout", { method: "POST", body: {} }),
};