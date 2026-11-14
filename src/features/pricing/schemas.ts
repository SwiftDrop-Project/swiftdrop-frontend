import { z } from "zod";

/*
 * zod schemas for pricing forms, with the same rules and messages as the backend (API.md "Pricing (WP4)",
 * FeeEstimateRequest.java). Change them together.
 */

export const PRICING_MESSAGES = {
  pickupDistrict: "Select the pickup district.",
  dropOffDistrict: "Select the drop-off district.",
  weight: "Enter the weight.",
  weightAboveZero: "Enter a weight above 0 kg.",
  weightTooHeavy: "A parcel can weigh up to 50 kg.",
  twoDecimals: "Use up to 2 decimal places.",
  length: "Enter the length.",
  width: "Enter the width.",
  height: "Enter the height.",
  measurement: "Use whole centimetres from 1 to 300.",
} as const;

const M = PRICING_MESSAGES;

const DECIMAL = /^\d+(?:\.\d+)?$/;
const TWO_DECIMALS = /^\d+(?:\.\d{1,2})?$/;
const WHOLE_NUMBER = /^\d+$/;

/** 0.01-50 kg, up to 2 decimals, checked in the backend's order. A string while editing, a number once valid. */
const weightKg = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    let issue: string | null = null;
    if (value === "" || !DECIMAL.test(value)) issue = M.weight;
    else if (Number(value) < 0.01) issue = M.weightAboveZero;
    else if (Number(value) > 50) issue = M.weightTooHeavy;
    else if (!TWO_DECIMALS.test(value)) issue = M.twoDecimals;
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform(Number);

/** Whole cm 1-300. Required here, as a booking needs the size (the estimate gives no vehicle without it). */
const centimetres = (missing: string) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const issue =
        value === ""
          ? missing
          : !WHOLE_NUMBER.test(value) || Number(value) < 1 || Number(value) > 300
            ? M.measurement
            : null;
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    })
    .transform(Number);

/** The admin's price calculator (POST /admin/pricing/estimate). Field names match the API's fieldErrors keys. */
export const priceCalculatorSchema = z.object({
  pickupDistrict: z.string({ error: M.pickupDistrict }).min(1, M.pickupDistrict),
  dropOffDistrict: z.string({ error: M.dropOffDistrict }).min(1, M.dropOffDistrict),
  weightKg,
  lengthCm: centimetres(M.length),
  widthCm: centimetres(M.width),
  heightCm: centimetres(M.height),
  keepUpright: z.boolean(),
  cashOnDelivery: z.boolean(),
});

/** What the form holds while the admin types (numbers as text). */
export type PriceCalculatorInput = z.input<typeof priceCalculatorSchema>;
/** What a valid form gives: the request body. */
export type PriceCalculatorValues = z.output<typeof priceCalculatorSchema>;
