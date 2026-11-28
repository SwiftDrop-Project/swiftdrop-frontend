"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Tabs switch between views of the same thing (Details / History). Two looks:
 * - "underline" (default): the active tab gets an orange-600 underline (an active state, DESIGN.md §1).
 * - "pills": rounded filter chips for narrowing one list (All / Active / Delivered / Failed). The active
 *   pill is filled grey-900 with white text; the others are white with a grey-300 border.
 * On phones the tab row scrolls sideways. To pick between two choices inside a form, use SegmentedControl instead.
 */

type TabsVariant = "underline" | "pills";

const TabsVariantContext = React.createContext<TabsVariant>("underline");

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-6", className)} {...props} />;
}

function TabsList({
  className,
  variant = "underline",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          variant === "pills"
            ? // The padding keeps the focus outline inside the scrolling row; the negative margin keeps the pills aligned.
              "-m-1 flex gap-2 overflow-x-auto p-1"
            : "flex gap-6 overflow-x-auto border-b border-grey-200",
          className,
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-label whitespace-nowrap transition-colors",
        variant === "pills"
          ? [
              "h-9 rounded-full border border-grey-300 bg-white px-4 text-grey-900 hover:bg-grey-50",
              "data-[state=active]:border-grey-900 data-[state=active]:bg-grey-900 data-[state=active]:font-semibold data-[state=active]:text-white",
              "disabled:pointer-events-none disabled:border-grey-200 disabled:text-grey-400",
            ]
          : [
              "-mb-px h-10 border-b-2 border-transparent text-grey-700 hover:text-grey-900",
              "data-[state=active]:border-orange-600 data-[state=active]:font-semibold data-[state=active]:text-grey-900",
              "disabled:pointer-events-none disabled:text-grey-400",
            ],
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsVariant };
