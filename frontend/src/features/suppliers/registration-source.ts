// frontend/src/features/suppliers/registration-source.ts
export const REGISTRATION_SOURCE = {
  ADMIN: "admin",
  SELF: "self",
} as const;

export type RegistrationSource =
  (typeof REGISTRATION_SOURCE)[keyof typeof REGISTRATION_SOURCE];

export const CONSENT_VERSION = "v1.0-2025-01"; // bump when wording changes