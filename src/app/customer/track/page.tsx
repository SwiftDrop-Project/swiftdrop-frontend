import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerTracking } from "@/features/tracking";

export const metadata: Metadata = { title: "Track a parcel" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CustomerTracking />
    </Suspense>
  );
}
