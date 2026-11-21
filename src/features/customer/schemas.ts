import { z } from "zod";
import { MESSAGES, personName, phone } from "@/lib/validation";

export const personalDetailsSchema = z.object({
  fullName: personName(MESSAGES.fullName),
  phone: phone,
});

export type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>;

export const deliveryPreferencesSchema = z.object({
  defaultPickupAddressId: z.string().min(1, "Select a default pickup address."),
  preferredPaymentMethod: z.enum(["CASH_ON_DELIVERY", "MOCK_CARD"]),
});

export type DeliveryPreferencesFormData = z.infer<typeof deliveryPreferencesSchema>;
