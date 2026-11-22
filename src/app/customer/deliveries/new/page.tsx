import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CreateDelivery } from "@/features/delivery";

export const metadata: Metadata = { title: "Create delivery" };

/*
 * Not FormPage: the form steps keep its 640px column, but the review step needs the side column for the fee
 * estimate, so CreateDelivery sets the widths itself.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        title="Create delivery"
        description="Tell us where to collect the parcel and where it goes."
        backHref="/customer"
        backLabel="Overview"
      />
      <CreateDelivery />
    </>
  );
}
