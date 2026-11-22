"use client";

import Link from "next/link";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { customerApi } from "../api";
import { deliveryPreferencesSchema, type DeliveryPreferencesFormData } from "../schemas";
import type { CustomerAddressSummary, CustomerProfileResponse, PaymentMethod } from "../types";

export function DeliveryPreferencesCard({
  profile,
  addresses,
  onPreferencesUpdated,
}: {
  profile: CustomerProfileResponse;
  addresses: CustomerAddressSummary[];
  onPreferencesUpdated: (updated: CustomerProfileResponse) => void;
}) {
  const [rootError, setRootError] = React.useState<string | null>(null);

  const defaultAddrId =
    profile.defaultPickupAddressId ||
    addresses.find((a) => a.isDefault)?.id ||
    addresses[0]?.id ||
    "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryPreferencesFormData>({
    resolver: zodResolver(deliveryPreferencesSchema),
    defaultValues: {
      defaultPickupAddressId: defaultAddrId,
      preferredPaymentMethod: profile.preferredPaymentMethod || "CASH_ON_DELIVERY",
    },
  });

  React.useEffect(() => {
    reset({
      defaultPickupAddressId: defaultAddrId,
      preferredPaymentMethod: profile.preferredPaymentMethod || "CASH_ON_DELIVERY",
    });
  }, [defaultAddrId, profile.preferredPaymentMethod, reset]);

  async function onSubmit(data: DeliveryPreferencesFormData) {
    setRootError(null);
    try {
      const updated = await customerApi.updatePreferences({
        defaultPickupAddressId: data.defaultPickupAddressId,
        preferredPaymentMethod: data.preferredPaymentMethod as PaymentMethod,
      });
      onPreferencesUpdated(updated);
      toast({
        tone: "success",
        title: "Preferences saved",
        description: "Your delivery preferences have been updated.",
      });
    } catch (error) {
      if (isApiError(error)) {
        setRootError(error.message);
      } else {
        setRootError("Failed to save delivery preferences. Please try again.");
      }
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-h3 font-semibold text-grey-900">Delivery preferences</h3>

        {rootError && (
          <InlineNotice tone="error" title="We couldn't save your preferences" className="mt-4">
            {rootError}
          </InlineNotice>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-5">
          <FormField
            id="pref-pickupAddress"
            label="Default pickup address"
            error={errors.defaultPickupAddressId?.message}
          >
            {(a11y) => (
              <div>
                <Select
                  {...a11y}
                  {...register("defaultPickupAddressId")}
                  size="md"
                >
                  {addresses.length === 0 ? (
                    <option value="" disabled>
                      No saved addresses
                    </option>
                  ) : null}
                  {addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label} · {addr.addressLine1}, {addr.city}
                    </option>
                  ))}
                </Select>
                <div className="mt-2">
                  <Link
                    href="/customer/addresses"
                    className="text-body-sm font-medium text-orange-700 hover:text-orange-800 hover:underline"
                  >
                    Manage addresses
                  </Link>
                </div>
              </div>
            )}
          </FormField>

          <div className="flex flex-col gap-2">
            <span className="text-label font-medium text-grey-900">Preferred payment method</span>
            <Controller
              name="preferredPaymentMethod"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="mt-1 flex flex-col gap-3"
                >
                  <label htmlFor="pref-cod" className="flex cursor-pointer items-center gap-3">
                    <RadioGroupItem value="CASH_ON_DELIVERY" id="pref-cod" />
                    <span className="text-body text-grey-900">Cash on delivery</span>
                  </label>
                  <label htmlFor="pref-card" className="flex cursor-pointer items-center gap-3">
                    <RadioGroupItem value="MOCK_CARD" id="pref-card" />
                    <span className="text-body text-grey-900">Mock card</span>
                  </label>
                </RadioGroup>
              )}
            />
            {errors.preferredPaymentMethod && (
              <p className="text-body-sm text-error">{errors.preferredPaymentMethod.message}</p>
            )}
          </div>

          <div className="mt-2">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Save preferences
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
