"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/layout/current-user";
import { firstName } from "@/lib/format";

/** "Welcome to SwiftDrop, Ayesha" with the real name from GET /auth/me. */
export function WelcomeHeading({ description }: { description: string }) {
  const user = useCurrentUser();

  const title = user ? (
    `Welcome to SwiftDrop, ${firstName(user.fullName)}`
  ) : (
    <>
      <span className="sr-only">Welcome to SwiftDrop</span>
      <span aria-hidden="true" className="block h-8 w-80 max-w-full animate-pulse rounded-md bg-grey-100" />
    </>
  );

  return <PageHeader title={title} description={description} />;
}
