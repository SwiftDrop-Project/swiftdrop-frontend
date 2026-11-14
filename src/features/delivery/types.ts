// Types matching the backend delivery module's DTOs (see ../swiftdrop-backend/API.md "Deliveries").
// ParcelStatus is shared (src/types/parcel.ts) because StatusBadge and other features use it too.
import type { Vehicle } from "@/features/pricing";
import type { DistrictCode, ParcelStatus } from "@/types";

export type { ParcelStatus } from "@/types";

/** Why a delivery attempt failed (backend delivery.FailureReason). */
export type FailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RECIPIENT_REFUSED"
  | "ADDRESS_UNREACHABLE"
  | "PARCEL_DAMAGED"
  | "OTHER";

/**
 * How the delivery fee is paid, chosen on the review step. UI only for now: POST /deliveries doesn't take it yet, so
 * it isn't in CreateDeliveryRequest. The payments work adds it there (and takes the online payment).
 */
export type PaymentMethod = "ONLINE" | "AT_PICKUP" | "AT_DROP_OFF";

/** A pickup or recipient. Phones go out as typed and come back as +947XXXXXXXX. */
export interface DeliveryContact {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  district: DistrictCode;
}

/** The packed outside measurements in whole cm, and whether the parcel must stay upright. */
export interface ParcelSize {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  keepUpright: boolean;
}

/** Body of POST /deliveries. No customer id and no fee: the server takes them from the login and pricing. */
export interface CreateDeliveryRequest {
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  /** Cash to collect on delivery; left out when the parcel is already paid. */
  codAmount?: number;
  instructions?: string;
  /** Whole cm, 1-300 each. */
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** Default false: the parcel may lie on its side. */
  keepUpright?: boolean;
}

/** Who received a delivered parcel, and whether the courier added a photo. */
export interface DeliveryProof {
  recipientName: string | null;
  hasPhoto: boolean;
}

/** A delivery as its customer sees it (POST /deliveries 201, and every item of My deliveries). */
export interface Delivery {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  /** Set by the server: pricing's quote, the same as POST /pricing/estimate gave for this parcel. */
  feeAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  /** Only while AT_BRANCH: the branch (a district) the parcel is at. */
  currentBranch: DistrictCode | null;
  /** Only while FAILED. */
  failureReason: FailureReason | null;
  /** Only once DELIVERED. */
  proof: DeliveryProof | null;
  /** null for parcels booked before sizes. */
  size: ParcelSize | null;
  /** The vehicle of the pickup and drop-off legs the fee was worked out with; null before sizes. */
  vehicle: Vehicle | null;
  /** The weight the fee was charged for (whole kg); null before sizes. */
  billableWeightKg: number | null;
}

/** One status change of a delivery. */
export interface DeliveryHistoryEntry {
  status: ParcelStatus;
  /** Only on AT_BRANCH entries. */
  branch: DistrictCode | null;
  note: string | null;
  /** Only on FAILED entries. */
  failureReason: FailureReason | null;
  occurredAt: string;
}

/** GET /deliveries/{id}: the delivery and its history, newest first. */
export interface DeliveryDetail {
  delivery: Delivery;
  history: DeliveryHistoryEntry[];
}

/** The query of GET /deliveries. `page` is 0-based; `size` is 1-100. */
export interface DeliveryListQuery {
  page: number;
  size: number;
  /** Leave out for every status. */
  status?: ParcelStatus;
}
