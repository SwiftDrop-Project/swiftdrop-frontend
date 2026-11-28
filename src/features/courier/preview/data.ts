import type { DistrictCode, ParcelStatus } from "@/types";
import type {
  AssignmentStatus,
  AssignmentType,
  Contact,
  FailureReason,
  FeePaymentMethod,
  ItemOutcome,
  TaskProblem,
} from "../types";
import { closes, type FeePaymentSource } from "./rules";

/*
 * PREVIEW ONLY. Sample parcels and the dispatch tasks that hold them, for the courier preview: made-up people, phone
 * numbers and ids (every id starts with 7e570000, every tracking number has a 9 after the month), kept in the
 * browser's memory. A full page reload starts again from this data. Dates are worked out from today in Sri Lankan
 * time. Every task belongs to the logged-in courier. Pickups and deliveries only: couriers aren't given branch transfers.
 */

/** A parcel status change as delivery keeps it. */
export interface PreviewHistoryEntry {
  status: ParcelStatus;
  branch: DistrictCode | null;
  failureReason: FailureReason | null;
  occurredAt: string;
}

/** A parcel as delivery keeps it. `history` is oldest first. */
export interface PreviewParcel {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  /** Only while AT_BRANCH. */
  currentBranch: DistrictCode | null;
  sender: Contact;
  recipient: Contact;
  weightKg: number;
  codAmount: number | null;
  /** The delivery fee as booked, its currency, and how it is paid (null: booked before payment methods). */
  feeAmount: number;
  currency: string;
  paymentMethod: FeePaymentMethod | null;
  /** The fee's recorded payment, as delivery.fee_payments keeps it: who recorded it and when; null while unpaid. */
  feePaidBy: FeePaymentSource | null;
  feePaidAt: string | null;
  instructions: string | null;
  failureReason: FailureReason | null;
  proofRecipientName: string | null;
  /** Once DELIVERED: where the preview shows the proof photo from (a sample image, or the photo the user picked). */
  proofPhotoUrl: string | null;
  updatedAt: string;
  history: PreviewHistoryEntry[];
}

/**
 * A made-up "signed delivery slip" for the sample deliveries (an inline SVG: nothing is fetched). Colours are the
 * DESIGN.md greys, written as plain names so the image has no hex values in source. A function (not a constant), so a
 * production build drops it with the rest of the preview code.
 */
export function sampleProofPhoto(): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">' +
      '<rect width="480" height="320" fill="whitesmoke"/>' +
      '<rect x="24" y="24" width="432" height="272" fill="white" stroke="silver"/>' +
      '<text x="48" y="72" font-family="sans-serif" font-size="22" fill="dimgray">SwiftDrop delivery slip</text>' +
      '<text x="48" y="112" font-family="sans-serif" font-size="16" fill="gray">Sample proof (preview mode)</text>' +
      '<path d="M60 220 C 110 170, 150 260, 200 210 S 290 190, 330 230" stroke="black" stroke-width="3" fill="none"/>' +
      '<line x1="48" y1="250" x2="432" y2="250" stroke="silver"/>' +
      '<text x="48" y="276" font-family="sans-serif" font-size="14" fill="gray">Recipient signature</text>' +
      "</svg>",
  );
}

/** One parcel in a task, as dispatch keeps it. */
export interface PreviewItem {
  parcelId: string;
  sequence: number;
  outcome: ItemOutcome;
  problem: TaskProblem | null;
  receivedBy: string | null;
  updatedAt: string;
  /** When the item closed (courier work); null while open. */
  closedAt: string | null;
}

export interface PreviewTask {
  assignmentId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  assignedAt: string;
  items: PreviewItem[];
}

export interface PreviewStore {
  now: Date;
  parcels: Map<string, PreviewParcel>;
  /** Newest assignment first. */
  tasks: PreviewTask[];
}

const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The Sri Lankan day of `date`, "2026-11-05". */
export function colomboDay(date: Date): string {
  return new Date(date.getTime() + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant today began in Sri Lanka. */
export function startOfColomboDay(date: Date): Date {
  return new Date(Date.parse(`${colomboDay(date)}T00:00:00Z`) - COLOMBO_OFFSET_MS);
}

const parcelId = (n: number) => `7e570000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const taskId = (n: number) => `7e570000-0000-4000-a000-${String(n).padStart(12, "0")}`;

const contact = (name: string, phone: string, address: string, city: string, district: DistrictCode): Contact => ({
  name,
  phone,
  address,
  city,
  district,
});

const SENDERS = [
  contact("Nugegoda Book Hub", "+94760000101", "112 High Level Road", "Nugegoda", "COLOMBO"),
  contact("Maharagama Craft Store", "+94760000102", "45 Old Kesbewa Road", "Maharagama", "COLOMBO"),
  contact("Dehiwala Spice Traders", "+94760000103", "8 Galle Road", "Dehiwala", "COLOMBO"),
  contact("Kotte Tea Corner", "+94760000104", "21 Parliament Road", "Kotte", "COLOMBO"),
];

const RECIPIENTS = [
  contact("Nimal Perera", "+94770000201", "45 Peradeniya Road", "Kandy", "KANDY"),
  contact("Ayesha Fernando", "+94770000202", "17 Temple Road", "Mount Lavinia", "COLOMBO"),
  contact("Ruwan Jayasinghe", "+94770000203", "3 Lake Drive", "Rajagiriya", "COLOMBO"),
  contact("Dilini Wickramasinghe", "+94770000204", "90 Station Road", "Gampaha", "GAMPAHA"),
  contact("Kasun Bandara", "+94770000205", "12 Main Street", "Galle", "GALLE"),
];

/** The payment methods the sample parcels cycle through, unless a parcel sets its own. */
const FEE_METHODS: readonly FeePaymentMethod[] = ["AT_PICKUP", "AT_DROP_OFF", "ONLINE"];

/**
 * The sample, worked out from `now`:
 * - A pickup in progress (3 parcels): one to pick up, one picked up and waiting for the handover, one already handed
 *   over today (completed while its siblings stay active).
 * - A pickup not started (3 parcels): pick up or mark Unable to Collect.
 * - A delivery in progress (6 parcels): one to take out (with cash to collect), three out for delivery, one failed and
 *   waiting to be returned to the branch, one delivered today.
 * - A delivery from yesterday whose parcel isn't at the branch yet (only Unable to Collect is possible).
 * - A pickup completed today (handed over, not collected), and a cancelled pickup that never shows as work.
 * - About 20 completed parcels on earlier days for History, including one parcel finished twice: a failed delivery
 *   returned to the branch, then delivered in a later task.
 * - Delivery fees paid every way: at pickup (the parcel to pick up shows the sender reminder), at drop-off (with and
 *   without cash on delivery), online (never shown as paid: there is no payment status), and one parcel booked before
 *   payment methods.
 */
export function createSampleStore(now: Date = new Date()): PreviewStore {
  const yymm = colomboDay(now).slice(2, 7).replace("-", "");
  const tracking = (n: number) => `SD${yymm}9${String(n).padStart(5, "0")}`;
  const startOfToday = startOfColomboDay(now).getTime();
  /** An instant `hours` after the start of today (negative: before today). */
  const at = (hours: number) => new Date(startOfToday + hours * 3_600_000).toISOString();

  const parcels = new Map<string, PreviewParcel>();
  const tasks: PreviewTask[] = [];

  function parcel(
    n: number,
    fields: Omit<Partial<PreviewParcel>, "history"> & {
      status: ParcelStatus;
      history: [ParcelStatus, number, DistrictCode?, FailureReason?][];
    },
  ): string {
    const id = parcelId(n);
    const history: PreviewHistoryEntry[] = fields.history.map(([status, hours, branch, failureReason]) => ({
      status,
      branch: branch ?? null,
      failureReason: failureReason ?? null,
      occurredAt: at(hours),
    }));
    parcels.set(id, {
      id,
      trackingNumber: tracking(n),
      currentBranch: null,
      sender: SENDERS[n % SENDERS.length],
      recipient: RECIPIENTS[n % RECIPIENTS.length],
      weightKg: 0.5 + (n % 5) * 0.4,
      codAmount: null,
      feeAmount: 350 + (n % 5) * 42.5,
      currency: "LKR",
      paymentMethod: FEE_METHODS[n % FEE_METHODS.length],
      feePaidBy: null,
      feePaidAt: null,
      instructions: null,
      failureReason: null,
      proofRecipientName: null,
      // Every sample parcel that is already delivered has a (sample) signed slip.
      proofPhotoUrl: fields.status === "DELIVERED" ? sampleProofPhoto() : null,
      updatedAt: history[history.length - 1].occurredAt,
      ...fields,
      history,
    });
    return id;
  }

  function task(
    n: number,
    type: AssignmentType,
    status: AssignmentStatus,
    branches: { origin?: DistrictCode; destination?: DistrictCode },
    assignedHours: number,
    items: { parcel: string; outcome: ItemOutcome; hours: number; problem?: TaskProblem; receivedBy?: string }[],
  ) {
    tasks.push({
      assignmentId: taskId(n),
      type,
      status,
      originBranch: branches.origin ?? null,
      destinationBranch: branches.destination ?? null,
      assignedAt: at(assignedHours),
      items: items.map((item, index) => ({
        parcelId: item.parcel,
        sequence: index + 1,
        outcome: item.outcome,
        problem: item.problem ?? null,
        receivedBy: item.receivedBy ?? null,
        updatedAt: at(item.hours),
        closedAt: closes(type, item.outcome) ? at(item.hours) : null,
      })),
    });
  }

  // ---- Today's work ----

  // A pickup in progress: siblings in one task, one already completed.
  const p1 = parcel(1, {
    status: "CREATED",
    paymentMethod: "AT_PICKUP",
    history: [["CREATED", -20]],
    instructions: "Ask for the parcel at the front desk.",
  });
  const p2 = parcel(2, { status: "PICKED_UP", paymentMethod: "AT_PICKUP", history: [["CREATED", -20], ["PICKED_UP", 8.5]] });
  const p3 = parcel(3, {
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    history: [["CREATED", -21], ["PICKED_UP", 8.2], ["AT_BRANCH", 9, "COLOMBO"]],
  });
  task(1, "PICKUP", "IN_PROGRESS", { destination: "COLOMBO" }, 8, [
    { parcel: p1, outcome: "PENDING", hours: 8 },
    { parcel: p2, outcome: "COLLECTED", hours: 8.5 },
    { parcel: p3, outcome: "HANDED_OVER", hours: 9, receivedBy: "S. Silva" },
  ]);

  // A pickup not started.
  const p4 = parcel(4, { status: "CREATED", paymentMethod: "ONLINE", history: [["CREATED", -6]] });
  // Booked before payment methods.
  const p5 = parcel(5, { status: "CREATED", paymentMethod: null, history: [["CREATED", -5]] });
  // The sender pays the fee at pickup; the cash on delivery is for the recipient, at delivery (not asked for here).
  const p17 = parcel(17, { status: "CREATED", paymentMethod: "AT_PICKUP", codAmount: 3200, history: [["CREATED", -4]] });
  task(2, "PICKUP", "ASSIGNED", { destination: "COLOMBO" }, 9.5, [
    { parcel: p4, outcome: "PENDING", hours: 9.5 },
    { parcel: p5, outcome: "PENDING", hours: 9.5 },
    { parcel: p17, outcome: "PENDING", hours: 9.5 },
  ]);

  // A delivery in progress: to take out (cash), out for delivery, failed (to return), delivered.
  const p6 = parcel(6, {
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    codAmount: 2450,
    // The recipient pays the fee and the cash on delivery: shown apart, with the total.
    paymentMethod: "AT_DROP_OFF",
    instructions: "Call before you arrive.",
    history: [["CREATED", -48], ["PICKED_UP", -40], ["AT_BRANCH", -38, "COLOMBO"]],
  });
  const p7 = parcel(7, {
    status: "OUT_FOR_DELIVERY",
    codAmount: 1200,
    paymentMethod: "ONLINE",
    history: [["CREATED", -50], ["PICKED_UP", -44], ["AT_BRANCH", -42, "COLOMBO"], ["OUT_FOR_DELIVERY", 8]],
  });
  const p8 = parcel(8, {
    status: "FAILED",
    failureReason: "RECIPIENT_UNAVAILABLE",
    // Not collected while the parcel goes back to the branch.
    paymentMethod: "AT_DROP_OFF",
    history: [
      ["CREATED", -52],
      ["PICKED_UP", -46],
      ["AT_BRANCH", -44, "COLOMBO"],
      ["OUT_FOR_DELIVERY", 8],
      ["FAILED", 9.5, undefined, "RECIPIENT_UNAVAILABLE"],
    ],
  });
  const p9 = parcel(9, {
    status: "DELIVERED",
    proofRecipientName: "Ayesha Fernando",
    history: [["CREATED", -60], ["PICKED_UP", -50], ["AT_BRANCH", -48, "COLOMBO"], ["OUT_FOR_DELIVERY", 8], ["DELIVERED", 10]],
  });
  // Out for delivery, the recipient pays only the fee (no cash on delivery).
  const p16 = parcel(16, {
    status: "OUT_FOR_DELIVERY",
    paymentMethod: "AT_DROP_OFF",
    history: [["CREATED", -50], ["PICKED_UP", -44], ["AT_BRANCH", -42, "COLOMBO"], ["OUT_FOR_DELIVERY", 8]],
  });
  // Out for delivery, the fee was for the sender at pickup: only the cash on delivery is collected here.
  const p18 = parcel(18, {
    status: "OUT_FOR_DELIVERY",
    paymentMethod: "AT_PICKUP",
    codAmount: 3200,
    history: [["CREATED", -50], ["PICKED_UP", -44], ["AT_BRANCH", -42, "COLOMBO"], ["OUT_FOR_DELIVERY", 8]],
  });
  task(3, "DELIVERY", "IN_PROGRESS", { origin: "COLOMBO" }, 7.5, [
    { parcel: p6, outcome: "PENDING", hours: 7.5 },
    { parcel: p7, outcome: "LOADED", hours: 8 },
    { parcel: p8, outcome: "FAILED", hours: 9.5 },
    { parcel: p9, outcome: "DELIVERED", hours: 10 },
    { parcel: p16, outcome: "LOADED", hours: 8 },
    { parcel: p18, outcome: "LOADED", hours: 8 },
  ]);

  // A delivery from yesterday whose parcel is still at another branch: it can't be taken out yet.
  const p10 = parcel(10, {
    status: "AT_BRANCH",
    currentBranch: "GAMPAHA",
    paymentMethod: "AT_DROP_OFF",
    history: [["CREATED", -30], ["PICKED_UP", -28], ["AT_BRANCH", -26, "GAMPAHA"]],
  });
  task(4, "DELIVERY", "ASSIGNED", { origin: "COLOMBO" }, -14, [{ parcel: p10, outcome: "PENDING", hours: -14 }]);

  // A pickup completed today: one not collected, one handed over.
  const p12 = parcel(12, { status: "CREATED", history: [["CREATED", -18]] });
  const p13 = parcel(13, {
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    history: [["CREATED", -18], ["PICKED_UP", 6.5], ["AT_BRANCH", 7.25, "COLOMBO"]],
  });
  task(6, "PICKUP", "COMPLETED", { destination: "COLOMBO" }, 6, [
    { parcel: p12, outcome: "NOT_COLLECTED", hours: 6.75, problem: "SENDER_UNAVAILABLE" },
    { parcel: p13, outcome: "HANDED_OVER", hours: 7.25, receivedBy: "K. Ranasinghe" },
  ]);

  // A pickup the dispatcher cancelled before it started: never shown as work, never completed.
  const p14 = parcel(14, { status: "CREATED", history: [["CREATED", -10]] });
  task(7, "PICKUP", "CANCELLED", { destination: "COLOMBO" }, 6.5, [{ parcel: p14, outcome: "PENDING", hours: 6.5 }]);

  // ---- Earlier days (History) ----

  // One parcel worked twice: the first delivery failed and was returned, a later delivery succeeded.
  const p15 = parcel(15, {
    status: "DELIVERED",
    proofRecipientName: "Ruwan Jayasinghe",
    history: [
      ["CREATED", -100],
      ["PICKED_UP", -96],
      ["AT_BRANCH", -94, "COLOMBO"],
      ["OUT_FOR_DELIVERY", -62],
      ["FAILED", -60, undefined, "WRONG_ADDRESS"],
      ["AT_BRANCH", -58, "COLOMBO"],
      ["OUT_FOR_DELIVERY", -14],
      ["DELIVERED", -12],
    ],
  });
  task(20, "DELIVERY", "COMPLETED", { origin: "COLOMBO" }, -64, [
    { parcel: p15, outcome: "RETURNED", hours: -58, receivedBy: "M. Perera" },
  ]);
  task(21, "DELIVERY", "COMPLETED", { origin: "COLOMBO" }, -16, [{ parcel: p15, outcome: "DELIVERED", hours: -12 }]);

  // Older completed pickups and deliveries, one per day or so.
  for (let n = 30; n < 48; n += 1) {
    const daysAgo = n - 29;
    const pickup = n % 3 === 0;
    const notCollected = n % 7 === 0;
    const hours = -24 * daysAgo + 11;
    const id = pickup
      ? parcel(n, {
          status: notCollected ? "CREATED" : "AT_BRANCH",
          currentBranch: notCollected ? null : "COLOMBO",
          history: notCollected ? [["CREATED", hours - 20]] : [["CREATED", hours - 20], ["PICKED_UP", hours - 2], ["AT_BRANCH", hours, "COLOMBO"]],
        })
      : parcel(n, {
          status: "DELIVERED",
          proofRecipientName: RECIPIENTS[n % RECIPIENTS.length].name,
          history: [["CREATED", hours - 60], ["PICKED_UP", hours - 50], ["AT_BRANCH", hours - 48, "COLOMBO"], ["OUT_FOR_DELIVERY", hours - 3], ["DELIVERED", hours]],
        });
    task(
      n,
      pickup ? "PICKUP" : "DELIVERY",
      "COMPLETED",
      pickup ? { destination: "COLOMBO" } : { origin: "COLOMBO" },
      hours - 4,
      [
        pickup
          ? notCollected
            ? { parcel: id, outcome: "NOT_COLLECTED", hours, problem: "PARCEL_NOT_READY" }
            : { parcel: id, outcome: "HANDED_OVER", hours, receivedBy: "S. Silva" }
          : { parcel: id, outcome: "DELIVERED", hours },
      ],
    );
  }

  // Cash fees already collected, as the backend would have recorded them: an AT_PICKUP fee once its parcel was picked
  // up, an AT_DROP_OFF fee once delivered. ONLINE fees stay unconfirmed (nothing verifies them), except one sample
  // below that shows how a verified online payment looks.
  for (const parcel of parcels.values()) {
    const picked = parcel.history.find((entry) => entry.status === "PICKED_UP");
    const delivered = parcel.history.find((entry) => entry.status === "DELIVERED");
    const paidAt = parcel.paymentMethod === "AT_PICKUP" ? picked : parcel.paymentMethod === "AT_DROP_OFF" ? delivered : undefined;
    if (paidAt) {
      parcel.feePaidBy = "COURIER_CASH";
      parcel.feePaidAt = paidAt.occurredAt;
    }
  }
  // PREVIEW SAMPLE ONLY: a verified online payment, to show the "Already Paid" badge. The real app gets this state only
  // from a payment the backend recorded; choosing ONLINE never creates it, and no screen can set it.
  const verified = parcels.get(p7);
  if (verified) {
    verified.feePaidBy = "ONLINE";
    verified.feePaidAt = at(-48);
  }

  tasks.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return { now, parcels, tasks };
}
