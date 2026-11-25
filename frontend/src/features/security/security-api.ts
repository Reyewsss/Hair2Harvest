import { api } from "@/lib/api";

export interface SecuritySettings {
  loginMaxAttempts: number;
  loginLockoutSeconds: number;
  passwordMinLength: number;
  passwordRequireMixedCase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
  otpResendSeconds: number;
  staffRequiresOtp: boolean;
  sessionHours: number;
  rememberMeDays: number;
}

export type FieldInfo = { type: "int" | "bool"; min?: number; max?: number; default: number | boolean };

// Super Admin only on the server. The limits come from the server so they're never duplicated here.
export const securityApi = {
  get: () => api<{ settings: SecuritySettings; fields: Record<keyof SecuritySettings, FieldInfo> }>("/security"),
  save: (settings: Partial<SecuritySettings>) =>
    api<{ settings: SecuritySettings }>("/security", { method: "PUT", body: { settings } }).then((r) => r.settings),
};
