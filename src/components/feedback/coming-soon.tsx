import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card, PageHeader } from "@/components/layout/page-header";
import { findNavItem } from "@/lib/navigation";
import { areaForPath, ROLE_HOME } from "@/lib/roles";

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
    <>
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
    </>
  );
}
