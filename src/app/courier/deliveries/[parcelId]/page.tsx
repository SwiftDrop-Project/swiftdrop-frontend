import type { Metadata } from "next";
import { CourierDeliveryDetail } from "@/features/courier";

export const metadata: Metadata = { title: "Parcel" };

/*
 * The parcel id is only known at request time, so the shell's sidebar (usePathname) can't be prerendered.
 * Allow this route to block instead of requiring a Suspense boundary in the shared layout.
 */
export const instant = false;

export default async function CourierParcelPage(props: PageProps<"/courier/deliveries/[parcelId]">) {
  const { parcelId } = await props.params;
  return <CourierDeliveryDetail parcelId={parcelId} />;
}
