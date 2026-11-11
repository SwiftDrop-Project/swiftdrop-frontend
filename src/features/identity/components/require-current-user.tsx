"use client";

import * as React from "react";
import type { User } from "../types";
import { useCurrentUser } from "./current-user";

interface RequireCurrentUserProps {
  /** Non-sensitive structural placeholder rendered while GET /auth/me is verifying the session. */
  fallback: React.ReactNode;
  /** Protected content mounted only after GET /auth/me confirms an authorized, onboarded session. */
  children: React.ReactNode | ((user: User) => React.ReactNode);
}

/**
 * Keeps Next.js <OuterLayoutRouter> mounted in AppShell while ensuring protected business UI and
 * data-fetching hooks never mount until GET /auth/me confirms an authorized, onboarded session.
 */
export function RequireCurrentUser({ fallback, children }: RequireCurrentUserProps) {
  const user = useCurrentUser();
  if (!user) return <>{fallback}</>;
  return <>{typeof children === "function" ? children(user) : children}</>;
}

