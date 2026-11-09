// Types matching the backend delivery module's DTOs (see ../swiftdrop-backend/API.md "Deliveries").
// ParcelStatus is shared (src/types/parcel.ts) because StatusBadge and other features use it too.
import type { DistrictCode, ParcelStatus } from "@/types";

export type { ParcelStatus } from "@/types";

/** A pickup or recipient. Phones go out as typed and come back as +947XXXXXXXX. */
export interface DeliveryContact {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  district: DistrictCode;
}

/** Body of POST /deliveries. No customer id and no fee: the server takes them from the login and pricing. */
export interface CreateDeliveryRequest {
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  /** Cash to collect on delivery; left out when the parcel is already paid. */
  codAmount?: number;
  instructions?: string;
}

/** A delivery as its customer sees it (POST /deliveries 201). */
export interface Delivery {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  /** Set by the server: a flat Rs. 450.00 until pricing (WP4) is connected. */
  feeAmount: number;
  currency: string;
  createdAt: string;
}
