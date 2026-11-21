import { z } from "zod";
import { phone } from "@/lib/validation";

/*
 * Same rules and messages as the backend (API.md "Merchant orders", CreateMerchantOrderRequest.java).
 * Change them together with the delivery schemas when the shared rules change.
 */

export const ORDER_MESSAGES = {
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
  length: "Enter the length.",
  width: "Enter the width.",
  height: "Enter the height.",
  measurement: "Use whole centimetres from 1 to 300.",
  refTooLong: "Use 100 characters or fewer.",
} as const;

const M = ORDER_MESSAGES;

export const contactSchema = z.object({
  name: z.string().trim().min(1, M.name).max(100, M.nameTooLong),
  phone,
  addressLine: z.string().trim().min(1, M.addressLine).max(200, M.addressLineTooLong),
  city: z.string().trim().min(1, M.city).max(80, M.cityTooLong),
  district: z.string({ error: M.district }).min(1, M.district),
});

const DECIMAL = /^\d+(?:\.\d+)?$/;
const TWO_DECIMALS = /^\d+(?:\.\d{1,2})?$/;

function decimalIssue(value: string, min: number, max: number, notANumber: string, tooLow: string, tooHigh: string): string | null {
  if (!DECIMAL.test(value)) return notANumber;
  const n = Number(value);
  if (n < min) return tooLow;
  if (n > max) return tooHigh;
  if (!TWO_DECIMALS.test(value)) return M.twoDecimals;
  return null;
}

const weightKg = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const issue =
      value === ""
        ? M.weight
        : decimalIssue(value, 0.01, 50, M.weight, M.weightAboveZero, M.weightTooHeavy);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform(Number);

const codAmount = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value === "") return;
    const issue = decimalIssue(value, 0.01, 500_000, M.codAboveZero, M.codAboveZero, M.codTooHigh);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform((v) => (v === "" ? undefined : Number(v)));

const instructions = z
  .string()
  .trim()
  .max(500, M.instructionsTooLong)
  .transform((v) => (v === "" ? undefined : v));

const WHOLE_NUMBER = /^\d+$/;

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

export const createOrderSchema = z.object({
  merchantOrderRef: z.string().trim().max(100, M.refTooLong).transform((v) => (v === "" ? undefined : v)),
  pickup: contactSchema,
  recipient: contactSchema,
  weightKg,
  codAmount,
  instructions,
  lengthCm: centimetres(M.length),
  widthCm: centimetres(M.width),
  heightCm: centimetres(M.height),
  keepUpright: z.boolean(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderValues = z.output<typeof createOrderSchema>;
