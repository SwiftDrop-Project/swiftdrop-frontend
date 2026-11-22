"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Info } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatRs } from "@/lib/format";
import { adminPricingApi } from "../admin-api";
import type { DistrictCentre } from "../admin-types";
import { FEE_COMPONENT_LABEL, VEHICLE_LABEL } from "../labels";
import { priceCalculatorSchema, type PriceCalculatorInput, type PriceCalculatorValues } from "../schemas";
import type { FeeEstimate } from "../types";

const FIELDS = [
  "pickupDistrict",
  "dropOffDistrict",
  "weightKg",
  "lengthCm",
  "widthCm",
  "heightCm",
] as const satisfies readonly (keyof PriceCalculatorInput)[];

const UNKNOWN_ERROR = "We couldn't work out the fee. Try again in a moment.";

/**
 * The price calculator: the same quote a customer's booking gets, with how it adds up. Nothing is saved.
 * `districts` null (still loading) disables the district selects.
 */
export function PriceCalculator({ districts }: { districts: DistrictCentre[] | null }) {
  const titleId = React.useId();
  const [result, setResult] = React.useState<FeeEstimate | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PriceCalculatorInput, unknown, PriceCalculatorValues>({
    resolver: zodResolver(priceCalculatorSchema),
    defaultValues: {
      pickupDistrict: "",
      dropOffDistrict: "",
      weightKg: "",
      lengthCm: "",
      widthCm: "",
      heightCm: "",
      keepUpright: false,
      cashOnDelivery: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      setResult(await adminPricingApi.estimate(values));
    } catch (error) {
      setResult(null);
      if (isApiError(error)) {
        const { handled } = applyServerFieldErrors(error, setError, FIELDS);
        if (!handled) setFailure(error.message);
      } else {
        setFailure(UNKNOWN_ERROR);
      }
    }
  });

  const districtOptions = (districts ?? []).map((district) => (
    <option key={district.district} value={district.district}>
      {district.name}
    </option>
  ));

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Price calculator"
        titleId={titleId}
        description="The same fee a customer is charged for this route and parcel"
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <CardContent>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <FormField id="calc-pickup" label="Pickup district" error={errors.pickupDistrict?.message}>
                {(a11y) => (
                  <Select {...a11y} {...register("pickupDistrict")} size="md" disabled={districts === null}>
                    <option value="" disabled>
                      Select a district
                    </option>
                    {districtOptions}
                  </Select>
                )}
              </FormField>
              <FormField id="calc-drop-off" label="Drop-off district" error={errors.dropOffDistrict?.message}>
                {(a11y) => (
                  <Select {...a11y} {...register("dropOffDistrict")} size="md" disabled={districts === null}>
                    <option value="" disabled>
                      Select a district
                    </option>
                    {districtOptions}
                  </Select>
                )}
              </FormField>
            </div>

            <FormField
              id="calc-weight"
              label="Weight (kg)"
              helper="Up to 50 kg"
              error={errors.weightKg?.message}
              className="sm:max-w-48"
            >
              {(a11y) => <Input {...a11y} {...register("weightKg")} size="md" inputMode="decimal" placeholder="2.5" />}
            </FormField>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-label text-grey-900">Packed size (cm)</legend>
              <div className="grid grid-cols-3 gap-3">
                <FormField id="calc-length" label="Length" error={errors.lengthCm?.message}>
                  {(a11y) => <Input {...a11y} {...register("lengthCm")} size="md" inputMode="numeric" placeholder="40" />}
                </FormField>
                <FormField id="calc-width" label="Width" error={errors.widthCm?.message}>
                  {(a11y) => <Input {...a11y} {...register("widthCm")} size="md" inputMode="numeric" placeholder="30" />}
                </FormField>
                <FormField id="calc-height" label="Height" error={errors.heightCm?.message}>
                  {(a11y) => <Input {...a11y} {...register("heightCm")} size="md" inputMode="numeric" placeholder="12" />}
                </FormField>
              </div>
            </fieldset>

            <div className="flex flex-col gap-3">
              <CheckboxRow control={control} name="keepUpright" id="calc-upright" label="Keep upright" />
              <CheckboxRow control={control} name="cashOnDelivery" id="calc-cod" label="Cash on delivery" />
            </div>

            {failure ? (
              <InlineNotice tone="error" title="We couldn't work out the fee">
                <p>{failure}</p>
              </InlineNotice>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
              <Calculator aria-hidden="true" />
              {isSubmitting ? "Working out the fee…" : "Work out the fee"}
            </Button>
          </form>
        </CardContent>

        <div
          className="border-t border-grey-200 lg:border-t-0 lg:border-l"
          aria-live="polite"
          aria-label="Calculated fee"
        >
          <QuoteResult result={result} />
        </div>
      </div>
    </Card>
  );
}

function CheckboxRow({
  control,
  name,
  id,
  label,
}: {
  control: ReturnType<typeof useForm<PriceCalculatorInput, unknown, PriceCalculatorValues>>["control"];
  name: "keepUpright" | "cashOnDelivery";
  id: string;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-3">
          <Checkbox
            id={id}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
          />
          <Label htmlFor={id} className="font-normal">
            {label}
          </Label>
        </div>
      )}
    />
  );
}

/** The fee and how it adds up, "needs a quote", or a hint before the first calculation. */
function QuoteResult({ result }: { result: FeeEstimate | null }) {
  if (result === null) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-4 text-body-sm text-grey-600 sm:p-6">
        <Calculator className="size-5 text-grey-500" aria-hidden="true" />
        <p>Choose a route and enter the parcel to see the fee and how it adds up.</p>
      </div>
    );
  }

  if (result.total === null) {
    return (
      <div className="flex flex-col gap-2 p-4 sm:p-6">
        <p className="text-label text-grey-600">Fee</p>
        <p className="text-h3 text-grey-900">Needs a quote</p>
        <p className="text-body-sm text-grey-600">
          No vehicle carries or fits this parcel, so a customer can&apos;t book it: booking answers &quot;This parcel
          is too big or too heavy for our vehicles.&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 p-4 sm:p-6">
        <p className="text-label text-grey-600">Fee</p>
        <p className="text-display text-grey-900 tabular-nums">{formatRs(result.total)}</p>
        <p className="text-body-sm text-grey-600">Rate card version {result.rateCardVersion}</p>
      </div>
      <dl
        aria-label="How the fee adds up"
        className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-grey-200 p-4 text-body-sm sm:p-6"
      >
        {result.lines.map((line) => (
          <React.Fragment key={line.component}>
            <dt className="text-grey-600">{FEE_COMPONENT_LABEL[line.component]}</dt>
            <dd className="text-right text-grey-900 tabular-nums">{formatRs(line.amount)}</dd>
          </React.Fragment>
        ))}
      </dl>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-grey-200 p-4 text-body-sm sm:p-6">
        <dt className="text-grey-600">Vehicle</dt>
        <dd className="text-right text-grey-900">{result.vehicle ? VEHICLE_LABEL[result.vehicle] : "None"}</dd>
        <dt className="text-grey-600">Volumetric weight</dt>
        <dd className="text-right text-grey-900 tabular-nums">
          {result.volumetricWeightKg === null ? "—" : `${result.volumetricWeightKg} kg`}
        </dd>
        <dt className="text-grey-600">Charged for</dt>
        <dd className="text-right text-grey-900 tabular-nums">{result.billableWeightKg} kg</dd>
        <dt className="text-grey-600">Between branches</dt>
        <dd className="text-right text-grey-900 tabular-nums">
          {result.distanceKm === null ? "—" : `${result.distanceKm} km`}
        </dd>
      </dl>
      <div className="flex gap-2 border-t border-grey-200 bg-grey-50 p-4 text-body-sm text-grey-700 lg:rounded-br-lg">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Nothing is saved. A booking works the fee out again when the delivery is created.</p>
      </div>
    </div>
  );
}
