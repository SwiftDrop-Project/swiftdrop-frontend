import { NextResponse, type NextRequest } from "next/server";
import { areaForPath, isRole, ROLE_HOME } from "@/lib/roles";
import type { Role } from "@/types";

/*
 * Route protection: redirects only. It reads the role from the SD_TOKEN cookie's JWT payload
 * WITHOUT verifying the signature, so it is a convenience, not security. The backend checks
 * every request.
 */

const COOKIE_NAME = "SD_TOKEN";
const AUTH_PAGES = new Set(["/login", "/register"]);

/** Role from the token, or null if there's no token, it can't be read, or it has expired. */
function roleFromToken(token: string | undefined): Role | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims !== "object" || claims === null) return null;
    const { role, exp } = claims as { role?: unknown; exp?: unknown };
    if (typeof exp === "number" && exp * 1000 <= Date.now()) return null;
    return isRole(role) ? role : null;
  } catch {
    return null;
  }
}

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = roleFromToken(request.cookies.get(COOKIE_NAME)?.value);
  const area = areaForPath(pathname);

  // Protected role areas
  if (area) {
    if (!role) {
      const next = new URLSearchParams({ next: `${pathname}${search}` });
      return redirectTo(request, "/login", `?${next.toString()}`);
    }
    if (role !== area) {
      return redirectTo(request, ROLE_HOME[role]);
    }
    return NextResponse.next();
  }

  // Logged-in users don't need the login/register pages or the root page
  if (role && (AUTH_PAGES.has(pathname) || pathname === "/")) {
    return redirectTo(request, ROLE_HOME[role]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/customer/:path*",
    "/merchant/:path*",
    "/courier/:path*",
    "/dispatcher/:path*",
  ],
};
