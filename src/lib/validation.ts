import { z } from "zod";

/*
 * Validation rules shared by every feature, with the same rules and messages as the backend
 * (API.md "Validation rules", PhoneNumberNormalizer.java). Change them together.
 * A feature's own form schemas live in src/features/<module>/schemas.ts and are built from these.
 */

export const MESSAGES = {
  identifier: "Enter your mobile number or email.",
  loginPassword: "Enter your password.",
  fullName: "Enter your full name.",
  phone: "Enter a Sri Lankan mobile number, like 077 123 4567.",
  email: "Enter a full email address, like name@example.com",
  password: "Use at least 8 characters, including a number.",
  businessName: "Enter your business name.",
  businessRegNo: "Use at most 30 characters.",
  parcelsPerMonth: "Select a range.",
  pickupDistrict: "Select a district.",
  branch: "Select a branch.",
  vehicleType: "Select a vehicle type.",
  city: "Enter your city or town.",
  acceptTerms: "Accept the terms to continue.",
  code: "Enter the 6-digit code.",
  currentPassword: "Enter your current password.",
  confirmPassword: "The passwords don't match.",
  samePassword: "Choose a different password from your current one.",
} as const;

/** 0771234567, 771234567 or +94771234567, spaces allowed. */
const PHONE_PATTERN = /^(?:\+94|0)?(7\d{8})$/;
/** 8-72 characters with at least one letter and one digit. */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
/** Needs a dot in the domain part, e.g. name@example.com. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isSriLankanMobile(value: string): boolean {
  return PHONE_PATTERN.test(value.replace(/\s+/g, ""));
}

export const personName = (message: string) => z.string().trim().min(2, message).max(100, message);
export const phone = z.string().trim().refine(isSriLankanMobile, MESSAGES.phone);
export const email = z.string().trim().max(254, MESSAGES.email).regex(EMAIL_PATTERN, MESSAGES.email);
export const password = z.string().regex(PASSWORD_PATTERN, MESSAGES.password);
export const acceptTerms = z.boolean().refine((value) => value, MESSAGES.acceptTerms);
/** A one-time code from an email: exactly 6 digits. */
export const code = z.string().regex(/^\d{6}$/, MESSAGES.code);
