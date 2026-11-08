import type { Metadata } from "next";
import { MarkDeliveredForm } from "@/features/courier";

export const metadata: Metadata = { title: "Mark as delivered" };

/*
 * The parcel id is only known at request time, so the shell's sidebar (usePathname) can't be prerendered.
 * Allow this route to block instead of requiring a Suspense boundary in the shared layout.
 */
export const instant = false;

export default async function MarkDeliveredPage(props: PageProps<"/courier/deliveries/[parcelId]/delivered">) {
  const { parcelId } = await props.params;
  return <MarkDeliveredForm parcelId={parcelId} />;
}
