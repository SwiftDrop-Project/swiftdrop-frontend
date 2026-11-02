import type { Metadata } from "next";
import { PageColumns } from "@/components/layout/page-columns";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { CustomerHelpCard, CustomerParcelsCard, CustomerSetupCard } from "@/features/delivery";
import { TrackParcelCard } from "@/features/tracking";

export const metadata: Metadata = { title: "Overview" };

/** docs/design/03 Dashboard shell.png */
export default function CustomerOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Send a parcel to any district, or follow one that is on its way to you." />
      <PageColumns
        aside={
          <>
            <TrackParcelCard />
            <CustomerHelpCard />
          </>
        }
      >
        <CustomerParcelsCard />
        <CustomerSetupCard />
      </PageColumns>
    </>
  );
}
