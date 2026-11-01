"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { authApi, isApiError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/roles";
import type { Role, User } from "@/types";

type UserState =
  | { status: "loading" }
  | { status: "ready"; user: User }
  | { status: "error"; message: string };

interface CurrentUserValue {
  state: UserState;
  retry: () => void;
  logout: () => Promise<void>;
  loggingOut: boolean;
  logoutError: string | null;
}

const CurrentUserContext = React.createContext<CurrentUserValue | null>(null);

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Loads the logged-in user from GET /auth/me for one role area.
 * - 401: clears the cookie first (so the proxy doesn't bounce us back), then goes to /login?next=…
 * - wrong role: goes to that user's own home.
 * - PROFILE_INCOMPLETE (Google sign-up not finished): goes to /register/complete.
 */
export function CurrentUserProvider({ area, children }: { area: Role; children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<UserState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((user) => {
        // Signed up with Google but not finished: the API refuses everything else (403 PROFILE_INCOMPLETE).
        if (user.status === "PROFILE_INCOMPLETE") {
          router.replace("/register/complete");
          return;
        }
        if (user.role !== area) {
          router.replace(ROLE_HOME[user.role]);
          return;
        }
        setState({ status: "ready", user });
      })
      .catch(async (error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.status === 401) {
          await authApi.logout().catch(() => undefined);
          router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });

    return () => controller.abort();
  }, [area, attempt, router]);

  const retry = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const logout = React.useCallback(async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await authApi.logout();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        isApiError(error) ? error.message : "We couldn't log you out. Try again in a moment.",
      );
      setLoggingOut(false);
    }
  }, [router]);

  const value = React.useMemo(
    () => ({ state, retry, logout, loggingOut, logoutError }),
    [state, retry, logout, loggingOut, logoutError],
  );

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>;
}

export function useCurrentUserState(): CurrentUserValue {
  const value = React.use(CurrentUserContext);
  if (!value) throw new Error("useCurrentUserState must be used inside CurrentUserProvider");
  return value;
}

/** The logged-in user, or null while GET /auth/me is still loading. */
export function useCurrentUser(): User | null {
  const { state } = useCurrentUserState();
  return state.status === "ready" ? state.user : null;
}
