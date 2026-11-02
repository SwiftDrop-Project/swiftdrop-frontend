"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Tabs switch between views of the same thing (Details / History). The active tab gets an
 * orange-600 underline (an active state, DESIGN.md §1). On phones the tab row scrolls sideways.
 * To pick between two choices inside a form, use SegmentedControl instead.
 */

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-6", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex gap-6 overflow-x-auto border-b border-grey-200", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 border-transparent text-label whitespace-nowrap text-grey-700 transition-colors hover:text-grey-900",
        "data-[state=active]:border-orange-600 data-[state=active]:font-semibold data-[state=active]:text-grey-900",
        "disabled:pointer-events-none disabled:text-grey-400",
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
