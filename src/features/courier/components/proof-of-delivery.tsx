"use client";

import { ExternalLink, ImageOff } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { courierApi } from "../api";
import type { CourierDelivery } from "../types";

/**
 * Proof of delivery of a parcel this courier delivered: who received it and the photo of the delivery slip they
 * signed (when it was delivered is in the summary and the history, so it isn't repeated here). The photo comes from
 * GET /courier/deliveries/{parcelId}/proof with the courier's login (it is never public) and isn't cached; "View
 * proof" opens it full size in a new tab. Renders nothing without proof (the API sends it only on the delivery entry).
 */
export function ProofOfDeliveryCard({ delivery }: { delivery: Pick<CourierDelivery, "parcelId" | "proof"> }) {
  const [failed, setFailed] = React.useState(false);
  const proof = delivery.proof;
  if (!proof) return null;
  const src = proof.hasPhoto ? courierApi.proofImageUrl(delivery.parcelId) : null;

  return (
    <Card aria-labelledby="parcel-proof-heading">
      <CardHeader title="Proof of delivery" titleId="parcel-proof-heading" />
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
          <dt className="text-grey-600">Received by</dt>
          <dd className="min-w-0 break-words">{proof.recipientName ?? "Not recorded"}</dd>
        </dl>

        {src && !failed ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Served by the backend with the login cookie (or a preview sample): next/image can't proxy it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Photo of the signed delivery slip"
              className="max-h-64 w-full rounded-md border border-grey-200 bg-grey-50 object-contain sm:w-72"
              onError={() => setFailed(true)}
            />
            <Button asChild variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                View proof
              </a>
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-body-sm text-grey-600">
            <ImageOff className="size-4 shrink-0" aria-hidden="true" />
            {proof.hasPhoto ? "The photo can't be shown right now. Try again later." : "No photo is attached."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
