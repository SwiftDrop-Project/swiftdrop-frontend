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
    title: "Prepare an endpoint on your server",
    text: "A public https:// address on your server that can receive our messages and confirm each one within 10 seconds. Your developer sets this up.",
  },
  {
    title: "Add one webhook",
    text: "Press Add webhook, paste the address and tick every event that server needs. One webhook can receive all events; you don't need one per status.",
  },
  {
    title: "Save the signing secret",
    text: "It's shown only once. Store it in your server's settings, for example an environment variable. If you lose it, use Rotate secret to get a new one.",
  },
  {
    title: "Check every message",
    text: "Your server should use the secret to check that each message really comes from SwiftDrop and is recent. Ready-made code for your developer is on each webhook's Setup guide tab.",
  },
  {
    title: "Send a test",
    text: "Use Send test from the ⋯ menu, then open the webhook: the test message should show as Succeeded within a few seconds.",
  },
  {
    title: "Handle the events",
    text: "Each message says what happened (for example Delivered) and includes your order number, so your system can update the right order. It should ignore a message it has already handled.",
  },
];

const GOOD_TO_KNOW: string[] = [
  `You can have up to ${MAX_ACTIVE_WEBHOOKS} active webhooks, one per address. Add more only for different systems, like billing or a test server.`,
  "Failed requests are retried right away, then after 1 min, 5 min, 15 min, 1 h and 6 h. After that the delivery is marked Failed and you can retry it from the webhook's history.",
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
