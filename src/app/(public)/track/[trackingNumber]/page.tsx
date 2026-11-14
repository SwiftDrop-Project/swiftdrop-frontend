import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicTrackingResult } from "@/features/tracking";

export const metadata: Metadata = { title: "Track a parcel" };

export default function TrackingResultPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PublicTrackingResult />
    </Suspense>
  );
}
