import { z } from "zod";
import { PARCELS_PER_MONTH_VALUES } from "@/lib/reference";
import { acceptTerms, code, email, MESSAGES, password, personName, phone } from "@/lib/validation";

/*
 * Same rules and messages as the backend (API.md "Validation rules",
 * RegisterRequest.java, LoginRequest.java). Change them together.
 */

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

/*
 * Finishing a Google sign-up (POST /auth/complete-profile): the register forms without email and
 * password. Built from the register schemas so the rules can't drift apart.
 */
export const customerCompleteProfileSchema = customerRegisterSchema.pick({ phone: true, acceptTerms: true });

export const merchantCompleteProfileSchema = merchantRegisterSchema.omit({ email: true, password: true });

/* Email verification and passwords (API.md "Email verification", "Passwords"). */

/** /verify-email without an email in the link: ask for the address the code goes to. */
export const emailOnlySchema = z.object({ email });

/** The API takes any identifier, but this screen asks for the email the code is sent to. */
export const forgotPasswordSchema = z.object({ email });

/** The email comes from the link (?email=), so the form only has the code and the new password. */
export const resetPasswordSchema = z
  .object({
    code,
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    message: MESSAGES.confirmPassword,
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, MESSAGES.currentPassword),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    message: MESSAGES.confirmPassword,
    path: ["confirmPassword"],
  });

export type EmailOnlyValues = z.input<typeof emailOnlySchema>;
export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.input<typeof changePasswordSchema>;
export type LoginValues = z.input<typeof loginSchema>;
export type CustomerCompleteProfileValues = z.input<typeof customerCompleteProfileSchema>;
export type MerchantCompleteProfileInput = z.input<typeof merchantCompleteProfileSchema>;
export type MerchantCompleteProfileValues = z.output<typeof merchantCompleteProfileSchema>;
export type CustomerRegisterValues = z.input<typeof customerRegisterSchema>;
export type MerchantRegisterInput = z.input<typeof merchantRegisterSchema>;
export type MerchantRegisterValues = z.output<typeof merchantRegisterSchema>;
