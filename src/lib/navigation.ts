import {
  Bike,
  ChartColumn,
  CircleQuestionMark,
  ClipboardList,
  CreditCard,
  House,
  KeyRound,
  ListClock,
  Map as MapIcon,
  MapPin,
  Package,
  PackageOpen,
  Search,
  SlidersHorizontal,
  SquarePlus,
  Store,
  Truck,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";
import { ROLE_HOME, ROLES } from "./roles";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** One line shown on the "coming soon" screen until the page is built. */
  description: string;
}

export interface NavGroup {
  /** Shown as an uppercase caption above the group. */
  label?: string;
  items: NavItem[];
}

/** Sidebar menu for each role. Every href has a page.tsx, so no link is broken. */
export const NAVIGATION: Record<Role, NavGroup[]> = {
  CUSTOMER: [
    {
      items: [
        { title: "Overview", href: "/customer", icon: House, description: "Your parcels at a glance." },
        {
          title: "Create delivery",
          href: "/customer/deliveries/new",
          icon: SquarePlus,
          description: "Enter the recipient, parcel weight and delivery address, and book a pickup.",
        },
        {
          title: "Track a parcel",
          href: "/customer/track",
          icon: Search,
          description: "Follow any parcel with its tracking number.",
        },
        {
          title: "My deliveries",
          href: "/customer/deliveries",
          icon: Package,
          description: "Every parcel you send will be listed here with its latest status.",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Addresses",
          href: "/customer/addresses",
          icon: MapPin,
          description: "Save pickup and delivery addresses so you don't have to type them each time.",
        },
        {
          title: "Payments",
          href: "/customer/payments",
          icon: CreditCard,
          description: "See what you've paid for each delivery and download receipts.",
        },
        {
          title: "Settings",
          href: "/customer/settings",
          icon: SlidersHorizontal,
          description: "Change your name, mobile number, email and password.",
        },
      ],
    },
  ],
  MERCHANT: [
    {
      items: [
        { title: "Overview", href: "/merchant", icon: House, description: "Your orders at a glance." },
        {
          title: "Orders",
          href: "/merchant/orders",
          icon: ClipboardList,
          description: "Every order you send will be listed here with its status and cash on delivery.",
        },
        {
          title: "Create order",
          href: "/merchant/orders/new",
          icon: SquarePlus,
          description: "Create an order and a rider will collect it from your pickup address.",
        },
        {
          title: "API keys",
          href: "/merchant/api-keys",
          icon: KeyRound,
          description: "Create keys so your online store can send orders to SwiftDrop.",
        },
        {
          title: "Webhooks",
          href: "/merchant/webhooks",
          icon: Webhook,
          description: "Get a message on your server whenever an order changes status.",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Settings",
          href: "/merchant/settings",
          icon: SlidersHorizontal,
          description: "Change your business details, pickup address and password.",
        },
      ],
    },
  ],
  COURIER: [
    {
      items: [
        {
          title: "Today's deliveries",
          href: "/courier",
          icon: Truck,
          description: "Parcels assigned to you for today.",
        },
        {
          title: "Delivery history",
          href: "/courier/history",
          icon: ListClock,
          description: "Every parcel you have picked up or delivered.",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Settings",
          href: "/courier/settings",
          icon: SlidersHorizontal,
          description: "Change your mobile number and password.",
        },
      ],
    },
  ],
  ADMIN: [
    {
      items: [
        { title: "Overview", href: "/dispatcher", icon: House, description: "Today's work at a glance." },
        {
          title: "Unassigned parcels",
          href: "/dispatcher/assign",
          icon: PackageOpen,
          description: "Assign waiting parcels to couriers by zone.",
        },
        {
          title: "Couriers",
          href: "/dispatcher/couriers",
          icon: Bike,
          description: "Add couriers and see who is working today.",
        },
        {
          title: "Merchants",
          href: "/dispatcher/merchants",
          icon: Store,
          description: "Approve new merchant accounts.",
        },
        {
          title: "Zones & pricing",
          href: "/dispatcher/zones",
          icon: MapIcon,
          description: "Set delivery zones and rates by district.",
        },
        {
          title: "Users",
          href: "/dispatcher/users",
          icon: Users,
          description: "Find any account and disable it if needed.",
        },
        {
          title: "Reports",
          href: "/dispatcher/reports",
          icon: ChartColumn,
          description: "Deliveries, failed attempts and cash on delivery by day and zone.",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Settings",
          href: "/dispatcher/settings",
          icon: SlidersHorizontal,
          description: "Change your password.",
        },
      ],
    },
  ],
};

/** "Help and support" sits at the bottom of every sidebar. */
export function helpItem(role: Role): NavItem {
  return {
    title: "Help and support",
    href: `${ROLE_HOME[role]}/help`,
    icon: CircleQuestionMark,
    description: "Guides, delivery rates and how to contact our support team.",
  };
}

export function settingsHref(role: Role): string | undefined {
  return NAVIGATION[role]
    .flatMap((group) => group.items)
    .find((item) => item.title === "Settings")?.href;
}

/** Top bar search: what it searches and where it goes for each role. */
export const SEARCH: Record<Role, { placeholder: string; href: string }> = {
  CUSTOMER: { placeholder: "Search deliveries by tracking number or recipient", href: "/customer/deliveries" },
  MERCHANT: { placeholder: "Search orders by tracking number or customer", href: "/merchant/orders" },
  COURIER: { placeholder: "Search by tracking number", href: "/courier/history" },
  ADMIN: { placeholder: "Search parcels, merchants or couriers", href: "/dispatcher/assign" },
};

function allItems(role: Role): NavItem[] {
  return [...NAVIGATION[role].flatMap((group) => group.items), helpItem(role)];
}

/** Finds the menu item for a page, e.g. for the "coming soon" screen. */
export function findNavItem(href: string): NavItem | undefined {
  for (const role of ROLES) {
    const item = allItems(role).find((candidate) => candidate.href === href);
    if (item) return item;
  }
  return undefined;
}

/**
 * The menu item to highlight: the longest href that matches the path,
 * so "/customer/deliveries/new" highlights "Create delivery", not "My deliveries".
 */
export function activeHref(role: Role, pathname: string): string | undefined {
  return allItems(role)
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
