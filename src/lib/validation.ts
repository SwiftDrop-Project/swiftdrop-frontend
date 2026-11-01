import { z } from "zod";
import type { ParcelsPerMonth } from "@/types";

/*
 * Same rules and messages as the backend (API.md "Validation rules",
 * RegisterRequest.java, LoginRequest.java, PhoneNumberNormalizer.java).
 * Change them together.
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
  city: "Enter your city or town.",
  acceptTerms: "Accept the terms to continue.",
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

export const PARCELS_PER_MONTH_OPTIONS: { value: ParcelsPerMonth; label: string }[] = [
  { value: "UNDER_50", label: "Under 50" },
  { value: "FROM_50_TO_200", label: "50 to 200" },
  { value: "FROM_200_TO_1000", label: "200 to 1,000" },
  { value: "OVER_1000", label: "Over 1,000" },
];

export function parcelsPerMonthLabel(value: ParcelsPerMonth): string {
  return PARCELS_PER_MONTH_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

const PARCELS_PER_MONTH_VALUES = PARCELS_PER_MONTH_OPTIONS.map((option) => option.value) as [
  ParcelsPerMonth,
  ...ParcelsPerMonth[],
];

const personName = (message: string) => z.string().trim().min(2, message).max(100, message);
const phone = z.string().trim().refine(isSriLankanMobile, MESSAGES.phone);
const email = z.string().trim().max(254, MESSAGES.email).regex(EMAIL_PATTERN, MESSAGES.email);
const password = z.string().regex(PASSWORD_PATTERN, MESSAGES.password);
const acceptTerms = z.boolean().refine((value) => value, MESSAGES.acceptTerms);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, MESSAGES.identifier),
  password: z.string().min(1, MESSAGES.loginPassword),
  rememberMe: z.boolean(),
});

export const customerRegisterSchema = z.object({
  fullName: personName(MESSAGES.fullName),
  phone,
  email,
  password,
  acceptTerms,
});

export const merchantRegisterSchema = z.object({
  businessName: z.string().trim().min(2, MESSAGES.businessName).max(120, MESSAGES.businessName),
  businessRegNo: z
    .string()
    .trim()
    .max(30, MESSAGES.businessRegNo)
    .transform((value) => (value === "" ? undefined : value)),
  // A plain string while editing (the select starts empty), the enum once valid.
  parcelsPerMonth: z
    .string()
    .pipe(z.enum(PARCELS_PER_MONTH_VALUES, { error: MESSAGES.parcelsPerMonth })),
  contactPerson: personName(MESSAGES.fullName),
  phone,
  email,
  // `error` also covers undefined, which is what a disabled select (districts still loading) gives.
  pickupDistrict: z.string({ error: MESSAGES.pickupDistrict }).min(1, MESSAGES.pickupDistrict),
  city: z.string().trim().min(2, MESSAGES.city).max(80, MESSAGES.city),
  password,
  acceptTerms,
});

export type LoginValues = z.input<typeof loginSchema>;
export type CustomerRegisterValues = z.input<typeof customerRegisterSchema>;
export type MerchantRegisterInput = z.input<typeof merchantRegisterSchema>;
export type MerchantRegisterValues = z.output<typeof merchantRegisterSchema>;
