import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { MyDeliveries } from "@/features/delivery";

export const metadata: Metadata = { title: "My deliveries" };

export default function Page() {
  return (
    <ListPage
      title="My deliveries"
      description="Every parcel you've sent, newest first."
      action={
        <Button asChild>
          <Link href="/customer/deliveries/new">
            <Plus aria-hidden="true" />
            Create delivery
          </Link>
        </Button>
      }
    >
      <MyDeliveries />
    </ListPage>
  );
}
