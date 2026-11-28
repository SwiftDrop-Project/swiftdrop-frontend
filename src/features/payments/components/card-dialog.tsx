"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { cardSchema, type CardFormData } from "../schemas";
import type { CardPaymentRequest } from "../types";

const FIELDS = ["cardNumber", "expiry", "cvc", "nameOnCard"] as const;
const EMPTY: CardFormData = { cardNumber: "", expiry: "", cvc: "", nameOnCard: "" };

/**
 * The mock card form in a dialog, shared by "Pay now" (Payments) and the payment gateway of Create delivery. Only
 * test numbers work and nothing real is charged. Browser autofill is off on purpose, so a real saved card is never
 * offered. `onSubmit` sends the card; an API error is shown in the dialog (field errors under their fields).
 */
export function CardDialog({
  open,
  title,
  description,
  submitLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  submitLabel: string;
  /** Resolves when the card was accepted; the dialog then resets. Throw (an ApiError) to keep it open. */
  onSubmit: (card: CardPaymentRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [notice, setNotice] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CardFormData>({ resolver: zodResolver(cardSchema), defaultValues: EMPTY });

  function close() {
    if (isSubmitting) return;
    reset(EMPTY);
    setNotice(null);
    onClose();
  }

  async function submit(data: CardFormData) {
    setNotice(null);
    try {
      await onSubmit({
        cardNumber: data.cardNumber.trim(),
        expiry: data.expiry.trim(),
        cvc: data.cvc.trim(),
        nameOnCard: data.nameOnCard.trim(),
      });
      reset(EMPTY);
    } catch (error) {
      if (isApiError(error)) {
        const { handled } = applyServerFieldErrors(error, setError, FIELDS);
        setNotice(handled ? "Check the fields marked below." : error.message);
      } else {
        setNotice("We couldn't reach the payment service. Try again in a moment.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      {open ? (
        <DialogContent
          onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()}
          onInteractOutside={(event) => isSubmitting && event.preventDefault()}
        >
          <form onSubmit={handleSubmit(submit)} noValidate autoComplete="off" className="grid gap-6">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <InlineNotice tone="info" title="Test cards only">
                Use 4242 4242 4242 4242 to pay, or 4000 0000 0000 0002 to see a declined card. Any future expiry
                date and any 3 digits work.
              </InlineNotice>
              {notice ? (
                <InlineNotice tone="error" title="The payment didn't go through">
                  {notice}
                </InlineNotice>
              ) : null}

              <FormField id="card-number" label="Card number" error={errors.cardNumber?.message}>
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register("cardNumber")}
                    size="md"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    autoComplete="off"
                    maxLength={23}
                    className="tabular-nums"
                  />
                )}
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField id="card-expiry" label="Expiry (MM/YY)" error={errors.expiry?.message}>
                  {(a11y) => (
                    <Input
                      {...a11y}
                      {...register("expiry")}
                      size="md"
                      inputMode="numeric"
                      placeholder="12/28"
                      autoComplete="off"
                      maxLength={5}
                      className="tabular-nums"
                    />
                  )}
                </FormField>
                <FormField id="card-cvc" label="Security code" error={errors.cvc?.message}>
                  {(a11y) => (
                    <Input
                      {...a11y}
                      {...register("cvc")}
                      size="md"
                      inputMode="numeric"
                      placeholder="123"
                      autoComplete="off"
                      maxLength={4}
                      className="tabular-nums"
                    />
                  )}
                </FormField>
              </div>
              <FormField id="card-name" label="Name on card" error={errors.nameOnCard?.message}>
                {(a11y) => (
                  <Input {...a11y} {...register("nameOnCard")} size="md" placeholder="Full name" autoComplete="off" />
                )}
              </FormField>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
