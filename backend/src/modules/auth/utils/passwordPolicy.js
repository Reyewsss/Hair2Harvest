// Returns an error message, or null when the password is acceptable.
export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be 72 characters or fewer."; // bcrypt limit
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Use both uppercase and lowercase letters.";
  if (!/\d/.test(password)) return "Include at least one number.";
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;