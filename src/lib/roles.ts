import type { Role } from "@/types";

export const ROLES: readonly Role[] = ["CUSTOMER", "MERCHANT", "COURIER", "ADMIN"];

/** Role → home page (API.md, "Role → home page"). */
export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/customer",
  MERCHANT: "/merchant",
  COURIER: "/courier",
  ADMIN: "/dispatcher",
};

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Customer",
  MERCHANT: "Merchant",
  COURIER: "Courier",
  ADMIN: "Admin",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Which role's area a path belongs to, e.g. "/customer/addresses" → CUSTOMER. Null for public pages. */
export function areaForPath(pathname: string): Role | null {
  for (const role of ROLES) {
    const home = ROLE_HOME[role];
    if (pathname === home || pathname.startsWith(`${home}/`)) return role;
  }
  return null;
}

const PLACEHOLDER_ORIGIN = "http://swiftdrop.invalid";

/**
 * Where to go after logging in. `next` is used only when it is a path inside this
 * user's own area; anything else (other sites, "//evil.com", other roles) goes to the role home.
 */
export function getSafeNext(next: string | null | undefined, role: Role): string {
  const home = ROLE_HOME[role];
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return home;
  }
  let url: URL;
  try {
    url = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return home;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN || areaForPath(url.pathname) !== role) {
    return home;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
