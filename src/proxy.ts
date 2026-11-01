import { NextResponse, type NextRequest } from "next/server";
import { areaForPath, isRole, ROLE_HOME } from "@/lib/roles";
import type { Role } from "@/types";

/*
 * Route protection: redirects only. It reads the role and status from the SD_TOKEN cookie's JWT
 * payload WITHOUT verifying the signature, so it is a convenience, not security. The backend checks
 * every request.
 */

const COOKIE_NAME = "SD_TOKEN";
const AUTH_PAGES = new Set(["/login", "/register"]);
/** Finishing a Google sign-up. Only for tokens with status PROFILE_INCOMPLETE. */
const COMPLETE_PROFILE = "/register/complete";

interface Session {
  role: Role;
  /** Google sign-up not finished: the API only allows /auth/me and /auth/complete-profile. */
  profileIncomplete: boolean;
}

/** Who the token is for, or null if there's no token, it can't be read, or it has expired. */
function sessionFromToken(token: string | undefined): Session | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims !== "object" || claims === null) return null;
    const { role, status, exp } = claims as { role?: unknown; status?: unknown; exp?: unknown };
    if (typeof exp === "number" && exp * 1000 <= Date.now()) return null;
    if (!isRole(role)) return null;
    return { role, profileIncomplete: status === "PROFILE_INCOMPLETE" };
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
  const session = sessionFromToken(request.cookies.get(COOKIE_NAME)?.value);
  const area = areaForPath(pathname);

  if (pathname === COMPLETE_PROFILE) {
    if (!session) return redirectTo(request, "/login");
    if (!session.profileIncomplete) return redirectTo(request, ROLE_HOME[session.role]);
    return NextResponse.next();
  }

  // Protected role areas
  if (area) {
    if (!session) {
      const next = new URLSearchParams({ next: `${pathname}${search}` });
      return redirectTo(request, "/login", `?${next.toString()}`);
    }
    if (session.profileIncomplete) {
      return redirectTo(request, COMPLETE_PROFILE);
    }
    if (session.role !== area) {
      return redirectTo(request, ROLE_HOME[session.role]);
    }
    return NextResponse.next();
  }

  // Logged-in users don't need the login/register pages or the root page
  if (session && (AUTH_PAGES.has(pathname) || pathname === "/")) {
    return redirectTo(request, session.profileIncomplete ? COMPLETE_PROFILE : ROLE_HOME[session.role]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/register/complete",
    "/customer/:path*",
    "/merchant/:path*",
    "/courier/:path*",
    "/dispatcher/:path*",
  ],
};
