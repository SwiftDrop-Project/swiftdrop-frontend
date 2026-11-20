import type { DistrictCode, ParcelStatus } from "@/types";
import type {
  AssignmentStatus,
  AssignmentType,
  Contact,
  FailureReason,
  ItemOutcome,
  ParcelHistoryEntry,
  TaskProblem,
} from "../types";
import { closes } from "./rules";

/*
 * PREVIEW ONLY. Sample tasks and parcels for the courier preview: made-up people, phone numbers and ids (every id
 * starts with 7e570000, every tracking number has a 9 after the month), kept in the browser's memory. A full page
 * reload starts again from this data. Dates are worked out from today in Sri Lankan time.
 */

/** A parcel as the preview stores it. `history` is oldest first. */
export interface PreviewParcel {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  currentBranch: DistrictCode | null;
  sender: Contact;
  recipient: Contact;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  history: ParcelHistoryEntry[];
}

/** One parcel in a task, as dispatch keeps it. */
export interface PreviewItem {
  parcelId: string;
  sequence: number;
  outcome: ItemOutcome;
  problem: TaskProblem | null;
  failureReason: FailureReason | null;
  note: string | null;
  receivedBy: string | null;
  recipientName: string | null;
  updatedAt: string;
  closed: boolean;
}

export interface PreviewTask {
  assignmentId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  scheduledFor: string;
  note: string | null;
  assignedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  items: PreviewItem[];
}

export interface PreviewStore {
  parcels: Map<string, PreviewParcel>;
  tasks: PreviewTask[];
}

// ---- Time (Asia/Colombo, UTC+05:30, no daylight saving) ----

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Colombo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Sri Lankan day of an instant, "2026-11-14". */
export function colomboDay(instant: Date): string {
  return DAY_FORMAT.format(instant);
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** An ISO instant for a Sri Lankan day and "HH:MM". */
function at(day: string, time: string): string {
  return new Date(`${day}T${time}:00+05:30`).toISOString();
}

// ---- Sample people and places ----

const COLOMBO_CITIES = [
  "Colombo 03",
  "Colombo 05",
  "Colombo 07",
  "Dehiwala",
  "Nugegoda",
  "Maharagama",
  "Kotte",
  "Battaramulla",
  "Wellawatte",
  "Borella",
];
const OTHER_PLACES: [string, DistrictCode][] = [
  ["Gampaha", "GAMPAHA"],
  ["Kandy", "KANDY"],
  ["Galle", "GALLE"],
  ["Kurunegala", "KURUNEGALA"],
  ["Kalutara", "KALUTARA"],
  ["Matara", "MATARA"],
  ["Negombo", "GAMPAHA"],
  ["Ratnapura", "RATNAPURA"],
];
const NAMES = [
  "Nimal Perera",
  "Ayesha Fernando",
  "Ruwan Silva",
  "Kamala Wijesinghe",
  "Tharindu Bandara",
  "Shanika de Silva",
  "Mohamed Rizwan",
  "Dilani Jayasuriya",
  "Saman Kumara",
  "Priya Rajapaksha",
  "Kasun Herath",
  "Fathima Nazeer",
];
const STREETS = ["Galle Road", "Havelock Road", "Duplication Road", "Kandy Road", "High Level Road", "Temple Road"];

function contact(index: number, city: string, district: DistrictCode): Contact {
  return {
    name: NAMES[index % NAMES.length],
    phone: `+9477000${String(100 + (index % 900)).padStart(4, "0")}`,
    address: `${10 + ((index * 7) % 180)} ${STREETS[index % STREETS.length]}`,
    city,
    district,
  };
}

const entry = (
  status: ParcelStatus,
  occurredAt: string,
  branch: DistrictCode | null = null,
  failureReason: FailureReason | null = null,
): ParcelHistoryEntry => ({ status, branch, failureReason, occurredAt });

const item = (
  parcelId: string,
  sequence: number,
  outcome: ItemOutcome,
  type: AssignmentType,
  updatedAt: string,
  extra: Partial<Omit<PreviewItem, "parcelId" | "sequence" | "outcome" | "updatedAt" | "closed">> = {},
): PreviewItem => ({
  parcelId,
  sequence,
  outcome,
  problem: null,
  failureReason: null,
  note: null,
  receivedBy: null,
  recipientName: null,
  updatedAt,
  closed: closes(type, outcome),
  ...extra,
});

/** Builds the whole sample: the open tasks on the Today screen, one finished today, and about 25 closed for History. */
export function createSampleStore(now: Date = new Date()): PreviewStore {
  const today = colomboDay(now);
  const yymm = today.slice(2, 4) + today.slice(5, 7);
  const day = (offset: number) => addDays(today, offset);
  /** Earlier today, but never before midnight: `minutes` before now. */
  const todayAgo = (minutes: number) => {
    const startOfToday = new Date(`${today}T00:01:00+05:30`).getTime();
    return new Date(Math.max(startOfToday, now.getTime() - minutes * 60_000)).toISOString();
  };

  let parcelCount = 0;
  let taskCount = 0;
  const parcels = new Map<string, PreviewParcel>();
  const tasks: PreviewTask[] = [];

  const addParcel = (fields: Omit<PreviewParcel, "id" | "trackingNumber">): PreviewParcel => {
    parcelCount += 1;
    const parcel: PreviewParcel = {
      id: `7e570000-0000-4000-9000-${String(parcelCount).padStart(12, "0")}`,
      trackingNumber: `SD${yymm}9${String(parcelCount).padStart(5, "0")}`,
      ...fields,
    };
    parcels.set(parcel.id, parcel);
    return parcel;
  };

  const addTask = (fields: Omit<PreviewTask, "assignmentId">): PreviewTask => {
    taskCount += 1;
    const task: PreviewTask = { assignmentId: `7e570000-0000-4000-8000-${String(taskCount).padStart(12, "0")}`, ...fields };
    tasks.push(task);
    return task;
  };

  // ---- Pickup, assigned: three parcels to collect in Colombo, handed over at the Colombo branch ----
  const p1 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Nimal Perera", phone: "+94770000101", address: "12 Galle Road", city: "Colombo 03", district: "COLOMBO" },
    recipient: contact(3, "Kandy", "KANDY"),
    weightKg: 1.2,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", at(day(-1), "16:10"))],
  });
  const p2 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Ayesha Fernando", phone: "+94770000102", address: "45 Havelock Road", city: "Colombo 05", district: "COLOMBO" },
    recipient: contact(4, "Gampaha", "GAMPAHA"),
    weightKg: 0.8,
    codAmount: 1800,
    instructions: "Fragile: glass bottles.",
    history: [entry("CREATED", at(day(-1), "18:25"))],
  });
  const p3 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Ruwan Silva", phone: "+94770000103", address: "8 Hill Street", city: "Dehiwala", district: "COLOMBO" },
    recipient: contact(5, "Galle", "GALLE"),
    weightKg: 3.5,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", todayAgo(150))],
  });
  addTask({
    type: "PICKUP",
    status: "ASSIGNED",
    originBranch: null,
    destinationBranch: "COLOMBO",
    scheduledFor: today,
    note: "Morning pickups in Colombo 03, Colombo 05 and Dehiwala. Hand everything over at the Colombo branch.",
    assignedAt: todayAgo(120),
    completedAt: null,
    cancelledAt: null,
    items: [p1, p2, p3].map((parcel, index) => item(parcel.id, index + 1, "PENDING", "PICKUP", todayAgo(120))),
  });

  // ---- Pickup, in progress: one collected (ready to hand over), one waiting, one not collected ----
  const p4 = addParcel({
    status: "PICKED_UP",
    currentBranch: null,
    sender: { name: "Shanika de Silva", phone: "+94770000104", address: "21 Duplication Road", city: "Colombo 07", district: "COLOMBO" },
    recipient: { name: "Kasun Herath", phone: "+94770000105", address: "3 Station Road", city: "Gampaha", district: "GAMPAHA" },
    weightKg: 2.4,
    codAmount: 2950,
    instructions: null,
    history: [entry("CREATED", at(day(-1), "15:00")), entry("PICKED_UP", todayAgo(50))],
  });
  const p5 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Kamala Wijesinghe", phone: "+94770000114", address: "7 Baseline Road", city: "Borella", district: "COLOMBO" },
    recipient: contact(7, "Negombo", "GAMPAHA"),
    weightKg: 5,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", at(day(-1), "11:20"))],
  });
  const p6 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Saman Kumara", phone: "+94770000115", address: "33 Pagoda Road", city: "Kotte", district: "COLOMBO" },
    recipient: contact(9, "Gampaha", "GAMPAHA"),
    weightKg: 1.1,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", at(day(-2), "14:45"))],
  });
  addTask({
    type: "PICKUP",
    status: "IN_PROGRESS",
    originBranch: null,
    destinationBranch: "COLOMBO",
    scheduledFor: today,
    note: "Afternoon pickups in Colombo 07, Borella and Kotte.",
    assignedAt: todayAgo(90),
    completedAt: null,
    cancelledAt: null,
    items: [
      item(p4.id, 1, "COLLECTED", "PICKUP", todayAgo(50), { note: "Collected from the front desk." }),
      item(p5.id, 2, "PENDING", "PICKUP", todayAgo(90)),
      item(p6.id, 3, "NOT_COLLECTED", "PICKUP", todayAgo(48), {
        problem: "SENDER_UNAVAILABLE",
        note: "Office closed; nobody answered the phone.",
      }),
    ],
  });

  // ---- Delivery, in progress, from the Colombo branch: waiting, out for delivery, delivered, failed ----
  const p7 = addParcel({
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    sender: contact(10, "Kandy", "KANDY"),
    recipient: { name: "Fathima Nazeer", phone: "+94770000107", address: "17 Marine Drive", city: "Colombo 06", district: "COLOMBO" },
    weightKg: 0.6,
    codAmount: 2500,
    instructions: "Call before coming. Third floor, no lift.",
    history: [
      entry("CREATED", at(day(-3), "09:30")),
      entry("PICKED_UP", at(day(-3), "11:00")),
      entry("AT_BRANCH", at(day(-3), "14:20"), "KANDY"),
      entry("IN_TRANSIT", at(day(-2), "08:15")),
      entry("AT_BRANCH", at(day(-2), "13:05"), "COLOMBO"),
    ],
  });
  const p8 = addParcel({
    status: "OUT_FOR_DELIVERY",
    currentBranch: null,
    sender: contact(11, "Matara", "MATARA"),
    recipient: { name: "Tharindu Bandara", phone: "+94770000108", address: "5 Lauries Road", city: "Colombo 04", district: "COLOMBO" },
    weightKg: 1.75,
    codAmount: 1500,
    instructions: "Leave with the security desk if nobody answers.",
    history: [
      entry("CREATED", at(day(-4), "10:10")),
      entry("PICKED_UP", at(day(-4), "12:40")),
      entry("AT_BRANCH", at(day(-4), "16:00"), "MATARA"),
      entry("IN_TRANSIT", at(day(-3), "07:50")),
      entry("AT_BRANCH", at(day(-3), "12:15"), "COLOMBO"),
      // Yesterday's attempt failed and was returned to the branch (see the history task below).
      entry("OUT_FOR_DELIVERY", at(day(-1), "09:30")),
      entry("FAILED", at(day(-1), "11:10"), null, "RECIPIENT_UNAVAILABLE"),
      entry("AT_BRANCH", at(day(-1), "15:20"), "COLOMBO"),
      entry("OUT_FOR_DELIVERY", todayAgo(45)),
    ],
  });
  const p9 = addParcel({
    status: "DELIVERED",
    currentBranch: null,
    sender: contact(0, "Kurunegala", "KURUNEGALA"),
    recipient: { name: "Sunil Jayawardena", phone: "+94770000109", address: "88 High Level Road", city: "Nugegoda", district: "COLOMBO" },
    weightKg: 4.2,
    codAmount: null,
    instructions: null,
    history: [
      entry("CREATED", at(day(-3), "13:00")),
      entry("PICKED_UP", at(day(-3), "15:30")),
      entry("AT_BRANCH", at(day(-3), "17:45"), "KURUNEGALA"),
      entry("IN_TRANSIT", at(day(-2), "09:00")),
      entry("AT_BRANCH", at(day(-2), "12:40"), "COLOMBO"),
      entry("OUT_FOR_DELIVERY", todayAgo(45)),
      entry("DELIVERED", todayAgo(20)),
    ],
  });
  const p10 = addParcel({
    status: "FAILED",
    currentBranch: null,
    sender: contact(1, "Galle", "GALLE"),
    recipient: { name: "Priya Rajapaksha", phone: "+94770000110", address: "9 Old Road", city: "Maharagama", district: "COLOMBO" },
    weightKg: 2,
    codAmount: 3200,
    instructions: null,
    history: [
      entry("CREATED", at(day(-4), "08:40")),
      entry("PICKED_UP", at(day(-4), "10:20")),
      entry("AT_BRANCH", at(day(-4), "13:00"), "GALLE"),
      entry("IN_TRANSIT", at(day(-3), "08:30")),
      entry("AT_BRANCH", at(day(-3), "11:50"), "COLOMBO"),
      entry("OUT_FOR_DELIVERY", todayAgo(45)),
      entry("FAILED", todayAgo(15), null, "RECIPIENT_UNAVAILABLE"),
    ],
  });
  addTask({
    type: "DELIVERY",
    status: "IN_PROGRESS",
    originBranch: "COLOMBO",
    destinationBranch: null,
    scheduledFor: today,
    note: "Colombo 04, 06, Nugegoda and Maharagama. Collect the cash before handing over.",
    assignedAt: todayAgo(70),
    completedAt: null,
    cancelledAt: null,
    items: [
      item(p7.id, 1, "PENDING", "DELIVERY", todayAgo(70)),
      item(p8.id, 2, "LOADED", "DELIVERY", todayAgo(45)),
      item(p9.id, 3, "DELIVERED", "DELIVERY", todayAgo(20), { recipientName: "Sunil Jayawardena" }),
      item(p10.id, 4, "FAILED", "DELIVERY", todayAgo(15), {
        failureReason: "RECIPIENT_UNAVAILABLE",
        note: "No answer at the gate or on the phone.",
      }),
    ],
  });

  // ---- Pickup, in progress, every parcel done: ready to complete ----
  const p11 = addParcel({
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    sender: { name: "Mohamed Rizwan", phone: "+94770000111", address: "60 Galle Road", city: "Wellawatte", district: "COLOMBO" },
    recipient: contact(2, "Jaffna", "JAFFNA"),
    weightKg: 6.5,
    codAmount: null,
    instructions: null,
    history: [
      entry("CREATED", at(day(-1), "17:30")),
      entry("PICKED_UP", todayAgo(100)),
      entry("AT_BRANCH", todayAgo(30), "COLOMBO"),
    ],
  });
  const p12 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: { name: "Dilani Jayasuriya", phone: "+94770000112", address: "14 Temple Road", city: "Kotte", district: "COLOMBO" },
    recipient: contact(4, "Kalutara", "KALUTARA"),
    weightKg: 0.9,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", at(day(-1), "19:05"))],
  });
  addTask({
    type: "PICKUP",
    status: "IN_PROGRESS",
    originBranch: null,
    destinationBranch: "COLOMBO",
    scheduledFor: today,
    note: null,
    assignedAt: todayAgo(130),
    completedAt: null,
    cancelledAt: null,
    items: [
      item(p11.id, 1, "HANDED_OVER", "PICKUP", todayAgo(30), { receivedBy: "Chamari (Colombo branch desk)" }),
      item(p12.id, 2, "NOT_COLLECTED", "PICKUP", todayAgo(80), {
        problem: "PARCEL_NOT_READY",
        note: "Sender asked us to come back tomorrow.",
      }),
    ],
  });

  // ---- Delivery planned for tomorrow (information only: it can be worked now) ----
  const p13 = addParcel({
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    sender: contact(5, "Kurunegala", "KURUNEGALA"),
    recipient: { name: "Saman Kumara", phone: "+94770000113", address: "2 Parliament Road", city: "Battaramulla", district: "COLOMBO" },
    weightKg: 12,
    codAmount: null,
    instructions: "Large box. Deliver to the back entrance.",
    history: [
      entry("CREATED", at(day(-2), "10:00")),
      entry("PICKED_UP", at(day(-2), "13:20")),
      entry("AT_BRANCH", at(day(-2), "16:40"), "KURUNEGALA"),
      entry("IN_TRANSIT", at(day(-1), "08:00")),
      entry("AT_BRANCH", at(day(-1), "11:30"), "COLOMBO"),
    ],
  });
  addTask({
    type: "DELIVERY",
    status: "ASSIGNED",
    originBranch: "COLOMBO",
    destinationBranch: null,
    scheduledFor: day(1),
    note: "Planned for tomorrow. You can start early if you have room.",
    assignedAt: todayAgo(60),
    completedAt: null,
    cancelledAt: null,
    items: [item(p13.id, 1, "PENDING", "DELIVERY", todayAgo(60))],
  });

  // ---- Pickup completed earlier today ----
  const p14 = addParcel({
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    sender: contact(7, "Colombo 05", "COLOMBO"),
    recipient: contact(8, "Kurunegala", "KURUNEGALA"),
    weightKg: 1.4,
    codAmount: null,
    instructions: null,
    history: [
      entry("CREATED", at(day(-1), "12:00")),
      entry("PICKED_UP", todayAgo(200)),
      entry("AT_BRANCH", todayAgo(170), "COLOMBO"),
    ],
  });
  const p15 = addParcel({
    status: "CREATED",
    currentBranch: null,
    sender: contact(9, "Borella", "COLOMBO"),
    recipient: contact(10, "Galle", "GALLE"),
    weightKg: 0.5,
    codAmount: null,
    instructions: null,
    history: [entry("CREATED", at(day(-1), "13:15"))],
  });
  addTask({
    type: "PICKUP",
    status: "COMPLETED",
    originBranch: null,
    destinationBranch: "COLOMBO",
    scheduledFor: today,
    note: "Early pickups before the branch opens.",
    assignedAt: todayAgo(240),
    completedAt: todayAgo(165),
    cancelledAt: null,
    items: [
      item(p14.id, 1, "HANDED_OVER", "PICKUP", todayAgo(170), { receivedBy: "Chamari (Colombo branch desk)" }),
      item(p15.id, 2, "NOT_COLLECTED", "PICKUP", todayAgo(190), { problem: "SENDER_UNAVAILABLE" }),
    ],
  });

  // ---- Delivery completed earlier today: one delivered, one failed and returned to the branch ----
  const p16 = addParcel({
    status: "DELIVERED",
    currentBranch: null,
    sender: contact(2, "Kandy", "KANDY"),
    recipient: { name: "Ayesha Fernando", phone: "+94770000116", address: "19 Park Road", city: "Colombo 05", district: "COLOMBO" },
    weightKg: 0.7,
    codAmount: 1200,
    instructions: null,
    history: [
      entry("CREATED", at(day(-3), "10:00")),
      entry("PICKED_UP", at(day(-3), "12:30")),
      entry("AT_BRANCH", at(day(-3), "15:00"), "KANDY"),
      entry("IN_TRANSIT", at(day(-2), "08:00")),
      entry("AT_BRANCH", at(day(-2), "12:00"), "COLOMBO"),
      entry("OUT_FOR_DELIVERY", todayAgo(230)),
      entry("DELIVERED", todayAgo(200)),
    ],
  });
  const p17 = addParcel({
    status: "AT_BRANCH",
    currentBranch: "COLOMBO",
    sender: contact(3, "Galle", "GALLE"),
    recipient: { name: "Ruwan Silva", phone: "+94770000117", address: "4 Flower Road", city: "Colombo 07", district: "COLOMBO" },
    weightKg: 3.1,
    codAmount: null,
    instructions: null,
    history: [
      entry("CREATED", at(day(-3), "09:00")),
      entry("PICKED_UP", at(day(-3), "11:15")),
      entry("AT_BRANCH", at(day(-3), "14:00"), "GALLE"),
      entry("IN_TRANSIT", at(day(-2), "07:45")),
      entry("AT_BRANCH", at(day(-2), "11:30"), "COLOMBO"),
      entry("OUT_FOR_DELIVERY", todayAgo(230)),
      entry("FAILED", todayAgo(210), null, "WRONG_ADDRESS"),
      entry("AT_BRANCH", todayAgo(185), "COLOMBO"),
    ],
  });
  addTask({
    type: "DELIVERY",
    status: "COMPLETED",
    originBranch: "COLOMBO",
    destinationBranch: null,
    scheduledFor: today,
    note: null,
    assignedAt: todayAgo(250),
    completedAt: todayAgo(180),
    cancelledAt: null,
    items: [
      item(p16.id, 1, "DELIVERED", "DELIVERY", todayAgo(200), { recipientName: "Ayesha Fernando" }),
      item(p17.id, 2, "RETURNED", "DELIVERY", todayAgo(185), {
        failureReason: "WRONG_ADDRESS",
        receivedBy: "Chamari (Colombo branch desk)",
        note: "House number doesn't exist on Flower Road.",
      }),
    ],
  });

  // ---- History: yesterday's delivery of the parcel now out for delivery again (search for it by tracking number) ----
  addTask({
    type: "DELIVERY",
    status: "COMPLETED",
    originBranch: "COLOMBO",
    destinationBranch: null,
    scheduledFor: day(-1),
    note: null,
    assignedAt: at(day(-1), "08:30"),
    completedAt: at(day(-1), "15:30"),
    cancelledAt: null,
    items: [
      item(p8.id, 1, "RETURNED", "DELIVERY", at(day(-1), "15:20"), {
        failureReason: "RECIPIENT_UNAVAILABLE",
        receivedBy: "Nuwan (Colombo branch)",
      }),
    ],
  });

  // ---- History: 23 more closed tasks over the last 12 days (2 pages of 20 with the ones above) ----
  const TYPES: AssignmentType[] = ["DELIVERY", "PICKUP"];
  for (let i = 0; i < 23; i += 1) {
    const type = TYPES[i % TYPES.length];
    const taskDay = day(-(1 + Math.floor((i + 1) / 2)));
    const daysAgo = 1 + Math.floor((i + 1) / 2);
    const cancelled = i % 7 === 5;
    const parcelTotal = (i % 3) + 1;
    const items: PreviewItem[] = [];

    for (let n = 0; n < parcelTotal; n += 1) {
      const seed = i * 3 + n;
      const colomboCity = COLOMBO_CITIES[seed % COLOMBO_CITIES.length];
      const other = OTHER_PLACES[(i + n) % OTHER_PLACES.length];
      // A PICKUP collects in Colombo; a DELIVERY ends in Colombo.
      const [fromCity, fromDistrict]: [string, DistrictCode] = type === "DELIVERY" ? other : [colomboCity, "COLOMBO"];
      const [toCity, toDistrict]: [string, DistrictCode] = type === "DELIVERY" ? [colomboCity, "COLOMBO"] : other;

      let outcome: ItemOutcome = "PENDING";
      const extra: Partial<PreviewItem> = {};
      if (!cancelled) {
        if (type === "PICKUP") {
          outcome = n === 1 && i % 2 === 0 ? "NOT_COLLECTED" : "HANDED_OVER";
        } else {
          outcome = n === 1 && i % 4 === 0 ? "RETURNED" : "DELIVERED";
        }
        if (outcome === "NOT_COLLECTED") extra.problem = "SENDER_UNAVAILABLE";
        if (outcome === "HANDED_OVER") extra.receivedBy = "Colombo branch desk";
        if (outcome === "DELIVERED") extra.recipientName = contact(seed + 1, toCity, toDistrict).name;
        if (outcome === "RETURNED") {
          extra.failureReason = "WRONG_ADDRESS";
          extra.receivedBy = "Colombo branch desk";
        }
      }

      const history = journey(type, outcome, cancelled, taskDay, daysAgo, fromDistrict, toDistrict);
      const last = history[history.length - 1];
      const parcel = addParcel({
        status: last.status,
        currentBranch: last.status === "AT_BRANCH" ? last.branch : null,
        sender: contact(seed, fromCity, fromDistrict),
        recipient: contact(seed + 1, toCity, toDistrict),
        weightKg: Math.round((0.5 + ((seed * 37) % 80) / 10) * 100) / 100,
        codAmount: seed % 3 === 0 ? 1000 + (seed % 5) * 450 : null,
        instructions: null,
        history,
      });
      items.push(item(parcel.id, n + 1, outcome, type, at(taskDay, "13:00"), extra));
    }

    addTask({
      type,
      status: cancelled ? "CANCELLED" : "COMPLETED",
      originBranch: type === "PICKUP" ? null : "COLOMBO",
      destinationBranch: type === "PICKUP" ? "COLOMBO" : null,
      scheduledFor: taskDay,
      note: cancelled ? "Cancelled by the dispatcher: parcels moved to another round." : null,
      assignedAt: at(taskDay, `08:${String(10 + (i % 40)).padStart(2, "0")}`),
      completedAt: cancelled ? null : at(taskDay, `16:${String(10 + (i % 40)).padStart(2, "0")}`),
      cancelledAt: cancelled ? at(taskDay, "09:30") : null,
      items,
    });
  }

  return { parcels, tasks };
}

/**
 * The status history of a parcel in a closed sample task. The courier's own step happens on the task's day; parcels
 * from tasks 3 days old or more have gone on to be delivered since.
 */
function journey(
  type: AssignmentType,
  outcome: ItemOutcome,
  cancelled: boolean,
  taskDay: string,
  daysAgo: number,
  from: DistrictCode,
  to: DistrictCode,
): ParcelHistoryEntry[] {
  const before = addDays(taskDay, -1);
  const after = addDays(taskDay, 1);
  const later = addDays(taskDay, 2);
  const goesOn = daysAgo >= 3;
  const deliveredLater = [
    entry("IN_TRANSIT", at(after, "08:00")),
    entry("AT_BRANCH", at(after, "12:00"), to),
    entry("OUT_FOR_DELIVERY", at(later, "09:00")),
    entry("DELIVERED", at(later, "11:30")),
  ];

  if (type === "PICKUP") {
    const created = entry("CREATED", at(before, "15:00"));
    if (cancelled || outcome === "NOT_COLLECTED") return [created];
    const picked = [created, entry("PICKED_UP", at(taskDay, "10:30")), entry("AT_BRANCH", at(taskDay, "13:00"), from)];
    return goesOn ? [...picked, ...deliveredLater] : picked;
  }

  // DELIVERY: picked up in the sender's district, then moved on to the Colombo branch (not by this courier).
  const inColombo = [
    entry("CREATED", at(addDays(taskDay, -2), "10:00")),
    entry("PICKED_UP", at(addDays(taskDay, -2), "12:00")),
    entry("AT_BRANCH", at(before, "11:00"), from),
    entry("IN_TRANSIT", at(before, "14:00")),
    entry("AT_BRANCH", at(before, "17:00"), "COLOMBO"),
  ];
  if (cancelled) return inColombo;
  const out = entry("OUT_FOR_DELIVERY", at(taskDay, "09:30"));
  if (outcome === "DELIVERED") return [...inColombo, out, entry("DELIVERED", at(taskDay, "12:00"))];
  const returned = [
    ...inColombo,
    out,
    entry("FAILED", at(taskDay, "11:00"), null, "WRONG_ADDRESS"),
    entry("AT_BRANCH", at(taskDay, "15:00"), "COLOMBO"),
  ];
  return goesOn
    ? [...returned, entry("OUT_FOR_DELIVERY", at(after, "09:30")), entry("DELIVERED", at(after, "12:15"))]
    : returned;
}
