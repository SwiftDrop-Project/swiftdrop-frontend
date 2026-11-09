import { z } from "zod";
import { phone } from "@/lib/validation";

/*
 * Same rules and messages as the backend (API.md "Book a delivery", CreateDeliveryRequest.java,
 * ContactRequest.java). Change them together.
 */

export const DELIVERY_MESSAGES = {
  name: "Enter a name.",
  nameTooLong: "Use 100 characters or fewer.",
  addressLine: "Enter the address.",
  addressLineTooLong: "Use 200 characters or fewer.",
  city: "Enter the city.",
  cityTooLong: "Use 80 characters or fewer.",
  district: "Select a district.",
  weight: "Enter the weight.",
  weightAboveZero: "Enter a weight above 0 kg.",
  weightTooHeavy: "A parcel can weigh up to 50 kg.",
  codAboveZero: "Enter an amount above 0, or leave it out.",
  codTooHigh: "Cash on delivery can be up to Rs. 500,000.",
  twoDecimals: "Use up to 2 decimal places.",
  instructionsTooLong: "Use 500 characters or fewer.",
} as const;

const M = DELIVERY_MESSAGES;

const contactSchema = z.object({
  name: z.string().trim().min(1, M.name).max(100, M.nameTooLong),
  phone,
  addressLine: z.string().trim().min(1, M.addressLine).max(200, M.addressLineTooLong),
  city: z.string().trim().min(1, M.city).max(80, M.cityTooLong),
  // `error` also covers undefined, which is what a disabled select (districts still loading) gives.
  district: z.string({ error: M.district }).min(1, M.district),
});

/** A number typed into a text box, e.g. "2.5" or "2500.00". */
const DECIMAL = /^\d+(?:\.\d+)?$/;
const TWO_DECIMALS = /^\d+(?:\.\d{1,2})?$/;

interface DecimalRules {
  min: number;
  max: number;
  notANumber: string;
  tooLow: string;
  tooHigh: string;
}

/** The first rule a typed amount breaks, checked in the backend's order, or null when it is fine. */
function decimalIssue(value: string, rules: DecimalRules): string | null {
  if (!DECIMAL.test(value)) return rules.notANumber;
  const amount = Number(value);
  if (amount < rules.min) return rules.tooLow;
  if (amount > rules.max) return rules.tooHigh;
  if (!TWO_DECIMALS.test(value)) return M.twoDecimals;
  return null;
}

/** 0.01-50 kg, up to 2 decimals. A string while editing, a number once valid. */
const weightKg = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const issue =
      value === ""
        ? M.weight
        : decimalIssue(value, {
            min: 0.01,
            max: 50,
            notANumber: M.weight,
            tooLow: M.weightAboveZero,
            tooHigh: M.weightTooHeavy,
          });
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform(Number);

/** Optional: empty means already paid (left out of the request). Otherwise Rs. 0.01-500,000, up to 2 decimals. */
const codAmount = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value === "") return;
    const issue = decimalIssue(value, {
      min: 0.01,
      max: 500_000,
      notANumber: M.codAboveZero,
      tooLow: M.codAboveZero,
      tooHigh: M.codTooHigh,
    });
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform((value) => (value === "" ? undefined : Number(value)));

/** Optional, up to 500 characters; blank means none. */
const instructions = z
  .string()
  .trim()
  .max(500, M.instructionsTooLong)
  .transform((value) => (value === "" ? undefined : value));

/** POST /deliveries. The field names match the API's fieldErrors keys, e.g. "pickup.phone". */
export const createDeliverySchema = z.object({
  pickup: contactSchema,
  recipient: contactSchema,
  weightKg,
  codAmount,
  instructions,
});

/** What the form holds while the customer types (numbers as text). */
export type CreateDeliveryInput = z.input<typeof createDeliverySchema>;
/** What a valid form gives: the request body. */
export type CreateDeliveryValues = z.output<typeof createDeliverySchema>;
