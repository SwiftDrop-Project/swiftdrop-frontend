"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { isApiError } from "@/lib/api";
import {
  CHANGE_PASSWORD_PATH,
  COMPLETE_PROFILE_PATH,
  onboardingFromUser,
  resolvePostAuthDestination,
} from "@/lib/roles";
import type { Role } from "@/types";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import type { User } from "../types";

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
  const [prevArea, setPrevArea] = React.useState(area);
  const [state, setState] = React.useState<UserState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [leaving, startLeaving] = useLeavingPage();
  const [logoutError, setLogoutError] = React.useState<string | null>(null);
  const epochRef = React.useRef(0);

  if (area !== prevArea) {
    setPrevArea(area);
    setState({ status: "loading" });
  }

  React.useEffect(() => {
    const epoch = ++epochRef.current;
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((user) => {
        if (controller.signal.aborted || epoch !== epochRef.current) return;
        const destination = resolvePostAuthDestination(onboardingFromUser(user));
        if (destination === COMPLETE_PROFILE_PATH || destination === CHANGE_PASSWORD_PATH) {
          router.replace(destination);
          return;
        }
        if (user.role !== area) {
          router.replace(destination);
          return;
        }
        setState({ status: "ready", user });
      })
      .catch(async (error: unknown) => {
        if (controller.signal.aborted || epoch !== epochRef.current) return;
        if (isApiError(error) && error.status === 401) {
          await authApi.logout().catch(() => undefined);
          if (epoch !== epochRef.current) return;
          router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });

    return () => {
      controller.abort();
    };
  }, [area, attempt, router]);

  const retry = React.useCallback(() => {
    epochRef.current += 1;
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const logout = React.useCallback(async () => {
    epochRef.current += 1;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await authApi.logout();
      setState({ status: "loading" });
      startLeaving();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        isApiError(error) ? error.message : "We couldn't log you out. Try again in a moment.",
      );
    } finally {
      setLoggingOut(false);
    }
  }, [router, startLeaving]);

  const value = React.useMemo(
    () => ({ state, retry, logout, loggingOut: loggingOut || leaving, logoutError }),
    [state, retry, logout, loggingOut, leaving, logoutError],
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
