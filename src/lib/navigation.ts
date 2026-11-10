import {
  Bike,
  Building2,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  Headset,
  House,
  KeyRound,
  ListClock,
  Map as MapIcon,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  PackageOpen,
  PackageX,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SquarePlus,
  Store,
  Truck,
  UserCheck,
  UserCog,
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
  /** Shown as an uppercase caption above the group (or collapsible trigger label). */
  label?: string;
  /** When true, the group renders as an expandable/collapsible section in the sidebar. */
  collapsible?: boolean;
  /** Initial expanded state for collapsible groups when no child item is active. */
  defaultOpen?: boolean;
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
  DISPATCHER: [
    {
      items: [
        { title: "Overview", href: "/dispatcher", icon: House, description: "Today's dispatch operations at a glance." },
        {
          title: "Unassigned parcels",
          href: "/dispatcher/assign",
          icon: PackageOpen,
          description: "Assign waiting parcels to active couriers by branch.",
        },
        {
          title: "All parcels",
          href: "/dispatcher/parcels",
          icon: Package,
          description: "Browse and filter parcels moving through your branch.",
        },
        {
          title: "Couriers",
          href: "/dispatcher/couriers",
          icon: Bike,
          description: "See active couriers and their current assignments.",
        },
        {
          title: "Live tracking",
          href: "/dispatcher/tracking",
          icon: Radar,
          description: "Follow active courier routes and parcel progress in real time.",
        },
        {
          title: "Delivery issues",
          href: "/dispatcher/issues",
          icon: CircleAlert,
          description: "Investigate delayed or failed delivery attempts and coordinate re-dispatch.",
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
  ADMIN: [
    {
      label: "Admin",
      items: [
        {
          title: "Overview",
          href: "/admin",
          icon: ShieldCheck,
          description: "Administration overview for staff, merchants and platform operations.",
        },
        {
          title: "User Management",
          href: "/admin/users",
          icon: Users,
          description: "Search and manage customer and platform accounts.",
        },
        {
          title: "Merchant Approvals",
          href: "/admin/merchants",
          icon: Store,
          description: "Review and approve or reject pending merchant applications.",
        },
        {
          title: "Courier Management",
          href: "/admin/couriers",
          icon: Bike,
          description: "Create, update, block, unblock, reset passwords for, and remove courier accounts.",
        },
        {
          title: "Dispatcher Management",
          href: "/admin/dispatchers",
          icon: Headset,
          description: "Create dispatcher accounts and inspect branch dispatcher details.",
        },
        {
          title: "All Parcels",
          href: "/admin/parcels",
          icon: Package,
          description: "Platform-wide parcel directory across all branches.",
        },
        {
          title: "Zones & Pricing",
          href: "/admin/zones",
          icon: MapIcon,
          description: "Configure service zones and inter-district routing rules.",
        },
        {
          title: "Delivery Rates",
          href: "/admin/rates",
          icon: Coins,
          description: "Manage base tariffs and weight-tier delivery rates.",
        },
        {
          title: "Reports & Analytics",
          href: "/admin/reports",
          icon: ChartColumn,
          description: "Delivery volume, SLA performance and COD reconciliation reports.",
        },
        {
          title: "System Settings",
          href: "/admin/settings",
          icon: Settings,
          description: "Platform-wide operational settings and system configuration.",
        },
      ],
    },
  ],
};

/**
 * Preserved titles, icons, and descriptions for retained `/admin/{customer,merchant,dispatcher,courier}/**`
 * placeholder pages (`ComingSoon`) without exposing those role-preview links in `NAVIGATION.ADMIN`.
 */
const RETAINED_ADMIN_PLACEHOLDER_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/admin/customer",
    icon: House,
    description: "Customer portal overview and delivery summary.",
  },
  {
    title: "Create Delivery",
    href: "/admin/customer/create-delivery",
    icon: SquarePlus,
    description: "Book a customer parcel pickup and delivery.",
  },
  {
    title: "My Deliveries",
    href: "/admin/customer/deliveries",
    icon: Package,
    description: "View active customer deliveries and parcel statuses.",
  },
  {
    title: "Track Parcel",
    href: "/admin/customer/track",
    icon: Search,
    description: "Look up any parcel with its tracking number.",
  },
  {
    title: "My Addresses",
    href: "/admin/customer/addresses",
    icon: MapPin,
    description: "Manage saved customer pickup and delivery addresses.",
  },
  {
    title: "Delivery History",
    href: "/admin/customer/history",
    icon: ListClock,
    description: "Browse completed and past customer deliveries.",
  },
  {
    title: "Payments & Receipts",
    href: "/admin/customer/payments",
    icon: CreditCard,
    description: "Inspect delivery charges, payments and downloadable receipts.",
  },
  {
    title: "Profile",
    href: "/admin/customer/profile",
    icon: UserCog,
    description: "Customer profile and contact preferences.",
  },
  {
    title: "Overview",
    href: "/admin/merchant",
    icon: Store,
    description: "Merchant portal summary, order volume and settlement status.",
  },
  {
    title: "Create Order",
    href: "/admin/merchant/create-order",
    icon: SquarePlus,
    description: "Create a merchant parcel order for pickup.",
  },
  {
    title: "My Orders",
    href: "/admin/merchant/orders",
    icon: ClipboardList,
    description: "View merchant orders, statuses and cash-on-delivery amounts.",
  },
  {
    title: "Track Shipments",
    href: "/admin/merchant/track",
    icon: Navigation,
    description: "Track merchant shipments across branches.",
  },
  {
    title: "Customers",
    href: "/admin/merchant/customers",
    icon: Users,
    description: "Recipient directory for merchant orders.",
  },
  {
    title: "API Keys",
    href: "/admin/merchant/api-keys",
    icon: KeyRound,
    description: "Manage merchant store integration API keys.",
  },
  {
    title: "Webhooks",
    href: "/admin/merchant/webhooks",
    icon: Webhook,
    description: "Configure webhook endpoints for parcel status events.",
  },
  {
    title: "Webhook Logs",
    href: "/admin/merchant/webhook-logs",
    icon: FileText,
    description: "Inspect webhook delivery attempts, response codes and retries.",
  },
  {
    title: "Business Profile",
    href: "/admin/merchant/profile",
    icon: Building2,
    description: "Merchant business details, pickup district and settlement info.",
  },
  {
    title: "Overview",
    href: "/admin/dispatcher",
    icon: Headset,
    description: "Branch dispatch queue and daily courier capacity.",
  },
  {
    title: "Unassigned Parcels",
    href: "/admin/dispatcher/unassigned",
    icon: PackageOpen,
    description: "Parcels waiting to be assigned to an eligible courier.",
  },
  {
    title: "All Parcels",
    href: "/admin/dispatcher/parcels",
    icon: Package,
    description: "Every parcel currently moving through dispatch.",
  },
  {
    title: "Couriers",
    href: "/admin/dispatcher/couriers",
    icon: Bike,
    description: "Active couriers available for parcel assignment.",
  },
  {
    title: "Assign Courier",
    href: "/admin/dispatcher/assign",
    icon: UserCheck,
    description: "Assign waiting parcels to active couriers by branch.",
  },
  {
    title: "Live Tracking",
    href: "/admin/dispatcher/tracking",
    icon: Radar,
    description: "Real-time courier route and parcel progress tracking.",
  },
  {
    title: "Delivery Issues",
    href: "/admin/dispatcher/issues",
    icon: CircleAlert,
    description: "Resolve failed delivery attempts and address exceptions.",
  },
  {
    title: "Overview",
    href: "/admin/courier",
    icon: Truck,
    description: "Courier shift overview and assigned route summary.",
  },
  {
    title: "Today's Deliveries",
    href: "/admin/courier/today",
    icon: PackageCheck,
    description: "Parcels scheduled for pickup and delivery today.",
  },
  {
    title: "My Assignments",
    href: "/admin/courier/assignments",
    icon: ClipboardList,
    description: "Current parcel manifest assigned to the courier.",
  },
  {
    title: "Delivery Details",
    href: "/admin/courier/delivery-details",
    icon: FileText,
    description: "Recipient contact, COD amount and address instructions.",
  },
  {
    title: "Update Status",
    href: "/admin/courier/update-status",
    icon: CircleCheck,
    description: "Record pickup, transit and proof-of-delivery updates.",
  },
  {
    title: "Delivery History",
    href: "/admin/courier/history",
    icon: ListClock,
    description: "Completed pickups and deliveries by date.",
  },
  {
    title: "Failed Deliveries",
    href: "/admin/courier/failed",
    icon: PackageX,
    description: "Parcels that could not be delivered and require follow-up.",
  },
  {
    title: "Profile",
    href: "/admin/courier/profile",
    icon: UserCog,
    description: "Courier vehicle, branch and contact details.",
  },
];

/** "Help and support" sits at the bottom of every sidebar. */
export function helpItem(role: Role): NavItem {
  return {
    title: "Help and support",
    href: `${ROLE_HOME[role]}/help`,
    icon: CircleQuestionMark,
    description: "Guides, delivery rates and how to contact our support team.",
  };
}

/**
 * Personal account settings link for the top-bar user menu.
 * For ADMIN, `/admin/settings` is reserved for System Settings, so personal account settings live at `/admin/account`.
 */
export function settingsHref(role: Role): string | undefined {
  if (role === "ADMIN") return "/admin/account";
  return NAVIGATION[role]
    .flatMap((group) => group.items)
    .find((item) => item.title === "Settings")?.href;
}

/** Top bar search: what it searches and where it goes for each role. */
export const SEARCH: Record<Role, { placeholder: string; href: string }> = {
  CUSTOMER: { placeholder: "Search deliveries by tracking number or recipient", href: "/customer/deliveries" },
  MERCHANT: { placeholder: "Search orders by tracking number or customer", href: "/merchant/orders" },
  COURIER: { placeholder: "Search by tracking number", href: "/courier/history" },
  DISPATCHER: { placeholder: "Search unassigned parcels", href: "/dispatcher/assign" },
  ADMIN: { placeholder: "Search couriers by name, email or mobile", href: "/admin/couriers" },
};

function allItems(role: Role): NavItem[] {
  return [...NAVIGATION[role].flatMap((group) => group.items), helpItem(role)];
}

/** Finds the menu item or retained placeholder metadata for a page, e.g. for the "coming soon" screen. */
export function findNavItem(href: string): NavItem | undefined {
  for (const role of ROLES) {
    const item = allItems(role).find((candidate) => candidate.href === href);
    if (item) return item;
  }
  return RETAINED_ADMIN_PLACEHOLDER_ITEMS.find((candidate) => candidate.href === href);
}

/**
 * The menu item to highlight: the longest href that matches the path,
 * so "/customer/deliveries/new" highlights "Create delivery", not "My deliveries".
 * Role home routes ("/admin", "/customer", etc.) match exact pathname only so unlisted account routes
 * such as "/admin/account" don't falsely highlight Overview.
 */
export function activeHref(role: Role, pathname: string): string | undefined {
  const home = ROLE_HOME[role];
  return allItems(role)
    .map((item) => item.href)
    .filter((href) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}
