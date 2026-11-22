import Link from "next/link";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCurrentUser } from "@/features/identity";
import { findNavItem } from "@/lib/navigation";
import { areaForPath, ROLE_HOME } from "@/lib/roles";

function ComingSoonSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <PageHeader
        title={<Skeleton className="h-8 w-56 max-w-full" />}
        description={
          <span
            aria-hidden="true"
            className="block h-5 w-80 max-w-full animate-pulse rounded-md bg-grey-100"
          />
        }
      />
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 py-6">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </Card>
    </div>
  );
}

/**
 * Placeholder for a menu item whose screen isn't built yet.
 * Title, icon and description come from the sidebar config in lib/navigation.ts.
 */
export function ComingSoon({ href }: { href: string }) {
  const item = findNavItem(href);
  const role = areaForPath(href);
  const home = role ? ROLE_HOME[role] : "/";
  const title = item?.title ?? "Coming soon";

  return (
    <RequireCurrentUser fallback={<ComingSoonSkeleton />}>
      <PageHeader title={title} description={item?.description} />
      <Card className="p-6 sm:p-8">
        <EmptyState
          icon={item?.icon ?? Construction}
          title={`${title} is coming soon`}
          description="We're still building this screen. Everything else in the menu works as usual."
          actions={
            href !== home ? (
              <Button asChild>
                <Link href={home}>Back to overview</Link>
              </Button>
            ) : undefined
          }
        />
      </Card>
    </RequireCurrentUser>
  );
}
