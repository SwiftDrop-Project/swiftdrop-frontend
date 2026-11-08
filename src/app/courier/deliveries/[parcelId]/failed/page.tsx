import type { Metadata } from "next";
import { MarkFailedForm } from "@/features/courier";

export const metadata: Metadata = { title: "Mark as failed" };

/*
 * The parcel id is only known at request time, so the shell's sidebar (usePathname) can't be prerendered.
 * Allow this route to block instead of requiring a Suspense boundary in the shared layout.
 */
export const instant = false;

export default async function MarkFailedPage(props: PageProps<"/courier/deliveries/[parcelId]/failed">) {
  const { parcelId } = await props.params;
  return <MarkFailedForm parcelId={parcelId} />;
}
