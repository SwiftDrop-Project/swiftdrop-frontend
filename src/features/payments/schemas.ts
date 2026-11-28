import { z } from "zod";

/** The mock card form: the same rules and messages as the API (API.md "Payments"). */
export const cardSchema = z.object({
  cardNumber: z.string().trim().regex(/^[0-9 ]{12,23}$/, "Enter the card number."),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Enter the expiry date as MM/YY."),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "Enter the 3 or 4 digit security code."),
  nameOnCard: z.string().trim().min(1, "Enter the name on the card.").max(100, "Use 100 characters or fewer."),
});

export type CardFormData = z.infer<typeof cardSchema>;
