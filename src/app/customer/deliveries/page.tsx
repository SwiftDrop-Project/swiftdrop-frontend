import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MyDeliveries } from "@/features/delivery";

export const metadata: Metadata = { title: "My deliveries" };

export default function Page() {
  return (
    <ListPage
      title="My deliveries"
      description="Every delivery you have booked, with its status and receipt."
      action={
        <Button asChild>
          <Link href="/customer/deliveries/new">
            <Plus aria-hidden="true" />
            Create delivery
          </Link>
        </Button>
      }
    >
      {/* Suspense: the list reads ?tab= and ?q= from the address (useSearchParams). */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <MyDeliveries />
      </Suspense>
    </ListPage>
  );
}
