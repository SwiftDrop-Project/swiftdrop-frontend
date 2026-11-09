import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { CreateDelivery } from "@/features/delivery";

export const metadata: Metadata = { title: "Create delivery" };

export default function Page() {
  return (
    <FormPage
      title="Create delivery"
      description="Tell us where to collect the parcel and where it goes."
      backHref="/customer"
      backLabel="Overview"
    >
      <CreateDelivery />
    </FormPage>
  );
}
