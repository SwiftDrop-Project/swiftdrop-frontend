"use client";

import { Copy, KeyRound } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { toast } from "@/components/ui/toast";

/**
 * Shows a signing secret once, after creating a webhook or rotating its secret. The secret lives only in the
 * caller's state while this dialog is open: never in storage, the URL or a log. The dialog can only be closed after
 * the merchant confirms they saved it (Escape, clicking outside and the close button are ignored until then).
 */
export function SecretDialog({
  secret,
  reason,
  onClose,
}: {
  /** null closes the dialog. */
  secret: string | null;
  reason: "created" | "rotated";
  onClose: () => void;
}) {
  const [saved, setSaved] = React.useState(false);
  const open = secret !== null;

  function close() {
    setSaved(false);
    onClose();
  }

  function handleOpenChange(next: boolean) {
    if (!next && saved) close();
  }

  function keepOpenUntilSaved(event: Event) {
    if (!saved) event.preventDefault();
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast({ tone: "success", title: "Secret copied" });
    } catch {
      toast({ tone: "error", title: "We couldn't copy it", description: "Select the secret and copy it yourself." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onEscapeKeyDown={keepOpenUntilSaved} onInteractOutside={keepOpenUntilSaved}>
        <DialogHeader>
          <DialogTitle>{reason === "created" ? "Webhook added" : "New signing secret"}</DialogTitle>
          <DialogDescription>
            Use this secret on your server to check that each request comes from SwiftDrop.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-2">
            <span className="text-label text-grey-900" id="webhook-secret-label">
              Signing secret
            </span>
            <div className="flex items-center gap-2 rounded-md border border-grey-300 bg-grey-50 p-3">
              <KeyRound className="size-5 shrink-0 text-grey-600" aria-hidden="true" />
              <code
                aria-labelledby="webhook-secret-label"
                className="min-w-0 flex-1 font-mono text-body-sm break-all text-grey-900 select-all"
              >
                {secret}
              </code>
              <Button type="button" variant="secondary" onClick={copy}>
                <Copy aria-hidden="true" />
                Copy
              </Button>
            </div>
          </div>
          <InlineNotice tone="info" title="You'll only see this once">
            Store it in your server&apos;s settings now. If you lose it, rotate the secret to get a new one.
            {reason === "rotated" ? " The previous secret has already stopped working." : null}
          </InlineNotice>
          <div className="flex items-start gap-3">
            <Checkbox
              id="webhook-secret-saved"
              checked={saved}
              onCheckedChange={(checked) => setSaved(checked === true)}
            />
            <label htmlFor="webhook-secret-saved" className="cursor-pointer text-body-sm text-grey-900">
              I&apos;ve saved the secret somewhere safe
            </label>
          </div>
        </DialogBody>
        <DialogFooter className="mt-6">
          <Button type="button" onClick={close} disabled={!saved}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
