"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAssistantChat } from "../hooks/use-assistant-chat";
import { AssistantPanel } from "./assistant-panel";

/**
 * "Ask SwiftDrop": a button fixed to the bottom right that opens the assistant chat from the side.
 * Put it once in a layout. `signedIn` (customer and merchant areas) lets the assistant list the user's own parcels.
 */
export function AssistantLauncher({ signedIn = false }: { signedIn?: boolean }) {
  const chat = useAssistantChat(signedIn);
  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* Icon only on phones, so it covers less of the page's footer. */}
        <Button className="fixed right-4 bottom-4 z-40 max-sm:size-12 max-sm:rounded-full max-sm:px-0">
          <MessageCircle aria-hidden="true" />
          <span className="max-sm:sr-only">Ask SwiftDrop</span>
        </Button>
      </SheetTrigger>
      {/* Full width on phones, 28rem from sm up (the Sheet's own width is the sidebar's). */}
      <SheetContent side="right" className="w-full! max-w-full sm:w-md!">
        <AssistantPanel chat={chat} signedIn={signedIn} />
      </SheetContent>
    </Sheet>
  );
}
