"use client";

import { Info, Plus } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { MAX_ACTIVE_WEBHOOKS } from "../labels";

/* A short, plain-language guide to setting up a webhook, opened from the info button on /merchant/webhooks. */

const STEPS: { title: string; text: string }[] = [
  {
    title: "Connect your shop with an API key",
    text: "Create a key on the API keys page. Your shop uses it to send its orders to SwiftDrop by itself, with your own order number on each one. Nobody needs to be signed in.",
  },
  {
    title: "Get a web address for updates",
    text: "Your shop needs a secure web address (starting with https://) where we can send updates. Your developer or website provider sets this up.",
  },
  {
    title: "Add a webhook",
    text: "Press Add webhook, paste that address and tick the updates you want. One webhook can get all of them.",
  },
  {
    title: "Save the secret",
    text: "You see it only once. Give it to your developer to keep safe. If it's lost, use Rotate secret to get a new one.",
  },
  {
    title: "Send a test",
    text: "Use Send test in the ⋯ menu. On the webhook's page the test ping should show as Succeeded within a few seconds.",
  },
  {
    title: "Let your shop use the updates",
    text: "Each update says what happened, for example Delivered, with your order number, so your shop can update the right order. Example code for your developer is on each webhook's Setup guide tab.",
  },
];

const GOOD_TO_KNOW: string[] = [
  `You can have up to ${MAX_ACTIVE_WEBHOOKS} webhooks turned on, each with its own address.`,
  "If your shop doesn't receive an update, we try again after 1 min, 5 min, 15 min, 1 hour and 6 hours. After that it shows as Failed, and you can send it again from the webhook's page.",
  "You can send a test or retry an update every 10 seconds.",
  "Turn a webhook off to pause it. Its history is kept, and you can turn it on again later.",
];

/**
 * The (i) button next to "Add webhook" and the guide it opens. With `onAdd`, the guide ends with an
 * "Add webhook" button that closes it and opens the add dialog.
 */
export function WebhookGuideButton({ onAdd, canAdd = false }: { onAdd?: () => void; canAdd?: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton label="How to set up a webhook" title="How to set up a webhook" onClick={() => setOpen(true)}>
        <Info />
      </IconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>How to set up a webhook</DialogTitle>
            <DialogDescription>
              A webhook sends a message to your server whenever one of your orders changes status, so your shop can
              update itself without checking SwiftDrop.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-50 text-label text-grey-900 tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1 pt-1">
                    <span className="text-label text-grey-900">{step.title}</span>
                    <span className="text-body-sm text-grey-600">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-2 rounded-md border border-grey-200 bg-grey-50 p-4">
              <span className="text-label text-grey-900">Good to know</span>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-grey-700">
                {GOOD_TO_KNOW.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            {onAdd ? (
              <Button
                type="button"
                disabled={!canAdd}
                onClick={() => {
                  setOpen(false);
                  onAdd();
                }}
              >
                <Plus aria-hidden="true" />
                Add webhook
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
