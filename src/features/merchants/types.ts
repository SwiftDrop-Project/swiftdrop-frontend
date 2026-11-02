import type { ApprovalStatus } from "@/features/identity";
import type { DistrictCode, ParcelsPerMonth } from "@/types";

/** Row of GET /admin/merchants. */
export interface MerchantApplication {
  userId: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  pickupDistrict: DistrictCode;
  city: string;
  parcelsPerMonth: ParcelsPerMonth;
  /** ISO timestamp of sign-up. */
  createdAt: string;
}

export type MerchantApplicationStatus = ApprovalStatus;
