import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { courierRoutes } from "../lib/labels";

/** 404 (or a parcel id that isn't a UUID) on the detail page and the delivered / failed forms. */
export function ParcelNotFound() {
  return (
    <>
      <PageHeader title="Parcel" backHref={courierRoutes.today} backLabel="Back to today's deliveries" />
      <Card className="p-6 sm:p-10">
        <EmptyState
          icon={PackageSearch}
          size="lg"
          title="We couldn't find this parcel"
          description="It isn't assigned to you any more, or the link is wrong."
          actions={
            <Button asChild>
              <Link href={courierRoutes.today}>Back to today&apos;s deliveries</Link>
            </Button>
          }
        />
      </Card>
    </>
  );
}
