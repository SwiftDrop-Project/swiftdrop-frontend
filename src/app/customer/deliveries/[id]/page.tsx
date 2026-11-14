import type { Metadata } from "next";
import { DeliveryDetail } from "@/features/delivery";

export const metadata: Metadata = { title: "Delivery" };

/*
 * The delivery id is only known at request time, so the shell's sidebar (usePathname) can't be prerendered.
 * Allow this route to block instead of requiring a Suspense boundary in the shared layout.
 */
export const instant = false;

export default async function DeliveryPage(props: PageProps<"/customer/deliveries/[id]">) {
  const { id } = await props.params;
  return <DeliveryDetail id={id} />;
}
