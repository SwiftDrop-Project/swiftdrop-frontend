import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { CourierTodayCard } from "@/features/dispatch";

export const metadata: Metadata = { title: "Today's deliveries" };

export default function CourierTodayPage() {
  return (
    <>
      <WelcomeHeading description="Your pickups and deliveries for today, in the order you should do them." />
      <CourierTodayCard />
    </>
  );
}
