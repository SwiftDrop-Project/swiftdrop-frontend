import type { DistrictCode } from "./meta";
import type { ApprovalStatus } from "./user";

export type ParcelsPerMonth = "UNDER_50" | "FROM_50_TO_200" | "FROM_200_TO_1000" | "OVER_1000";

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
