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

/** The address form: the same rules and messages as the API (API.md "Saved addresses"). */
export const addressSchema = z.object({
  label: z.string().trim().min(1, "Enter a label, like Home or Office.").max(40, "Use 40 characters or fewer."),
  contactName: z.string().trim().min(1, "Enter a name.").max(100, "Use 100 characters or fewer."),
  phone: phone,
  addressLine: z.string().trim().min(1, "Enter the address.").max(200, "Use 200 characters or fewer."),
  city: z.string().trim().min(1, "Enter the city.").max(80, "Use 80 characters or fewer."),
  district: z.string().min(1, "Select a district."),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Enter the 5-digit postal code."),
  landmark: z.string().trim().max(150, "Use 150 characters or fewer."),
  useAsDefault: z.boolean(),
});

export type AddressFormData = z.infer<typeof addressSchema>;
