"use client";

import { Bike, Headset, PackageOpen } from "lucide-react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourierWorkloadView } from "./courier-workload";
import { DispatchQueue } from "./dispatch-queue";

type AdminDispatchTab = "accounts" | "assign" | "couriers";

const TABS: { value: AdminDispatchTab; label: string; icon: typeof Bike }[] = [
  { value: "accounts", label: "Dispatcher accounts", icon: Headset },
  { value: "assign", label: "Assign parcels", icon: PackageOpen },
  { value: "couriers", label: "Couriers' parcels", icon: Bike },
];

/**
 * The admin's Dispatcher Management page: the dispatcher accounts (`accounts`, from identity), plus the dispatch
 * screens admins cannot open under /dispatcher: give waiting parcels to couriers, and see what each courier has.
 * The dispatch endpoints accept ADMIN as well as DISPATCHER.
 */
export function AdminDispatchTabs({ accounts }: { accounts: React.ReactNode }) {
  const [tab, setTab] = React.useState<AdminDispatchTab>("accounts");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as AdminDispatchTab)}>
      <TabsList aria-label="Dispatcher management">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value}>
            <Icon aria-hidden="true" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="accounts">{accounts}</TabsContent>
      <TabsContent value="assign">
        <DispatchQueue openTaskAfterCreate={false} />
      </TabsContent>
      <TabsContent value="couriers">
        <CourierWorkloadView taskLinks={false} />
      </TabsContent>
    </Tabs>
  );
}
