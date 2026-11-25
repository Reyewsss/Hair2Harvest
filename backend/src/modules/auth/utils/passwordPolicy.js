import { current } from "../../security/securitySettings.js";

// Returns an error message, or null when the password is acceptable.
export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) return "Password is required.";
  const s = current();
  if (password.length < s.passwordMinLength) return `Password must be at least ${s.passwordMinLength} characters.`;
  if (password.length > 72) return "Password must be 72 characters or fewer."; // bcrypt limit
  if (s.passwordRequireMixedCase && (!/[a-z]/.test(password) || !/[A-Z]/.test(password))) {
    return "Use both uppercase and lowercase letters.";
  }
  if (s.passwordRequireNumber && !/\d/.test(password)) return "Include at least one number.";
  if (s.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) return "Include at least one symbol.";
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;