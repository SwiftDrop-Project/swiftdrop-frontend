"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import { FormActions, FormPage, FormSection } from "@/components/layout/form-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useFeeEstimate, type FeeEstimateRequest } from "@/features/pricing";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { merchantOrdersApi } from "../api";
import { createOrderSchema, type CreateOrderInput, type CreateOrderValues } from "../schemas";

const STEPS = [
  { label: "Pickup", description: "Where we collect from" },
  { label: "Recipient", description: "Where we deliver to" },
  { label: "Parcel", description: "Weight and dimensions" },
  { label: "Review", description: "Confirm and submit" },
];

const EMPTY_CONTACT = { name: "", phone: "", addressLine: "", city: "", district: "" };

const DEFAULT_VALUES: CreateOrderInput = {
  merchantOrderRef: "",
  pickup: { ...EMPTY_CONTACT },
  recipient: { ...EMPTY_CONTACT },
  weightKg: "",
  codAmount: "",
  instructions: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  keepUpright: false,
};

type StepKey = "pickup" | "recipient" | "parcel" | "review";
const STEP_FIELDS: Record<StepKey, readonly Path<CreateOrderInput>[]> = {
  pickup: ["pickup.name", "pickup.phone", "pickup.addressLine", "pickup.city", "pickup.district"],
  recipient: ["recipient.name", "recipient.phone", "recipient.addressLine", "recipient.city", "recipient.district"],
  parcel: ["weightKg", "lengthCm", "widthCm", "heightCm", "codAmount", "instructions"],
  review: [],
};

const SERVER_FIELDS: readonly Path<CreateOrderInput>[] = [
  ...STEP_FIELDS.pickup,
  ...STEP_FIELDS.recipient,
  ...STEP_FIELDS.parcel,
  "merchantOrderRef",
];

/** Create order form — 4 steps: Pickup → Recipient → Parcel → Review. */
export function CreateOrderForm() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

  const form = useForm<CreateOrderInput, unknown, CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { register, control, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } = form;

  async function goNext() {
    const stepKey = (["pickup", "recipient", "parcel"] as StepKey[])[step];
    const valid = await trigger(STEP_FIELDS[stepKey] as Path<CreateOrderInput>[]);
    if (valid) setStep((s) => s + 1);
  }

  async function onSubmit(values: CreateOrderValues) {
    setSubmitError(undefined);
    try {
      const order = await merchantOrdersApi.create({
        pickup: values.pickup,
        recipient: values.recipient,
        weightKg: values.weightKg,
        ...(values.merchantOrderRef ? { merchantOrderRef: values.merchantOrderRef } : {}),
        ...(values.codAmount !== undefined ? { codAmount: values.codAmount } : {}),
        ...(values.instructions ? { instructions: values.instructions } : {}),
        lengthCm: values.lengthCm,
        widthCm: values.widthCm,
        heightCm: values.heightCm,
        ...(values.keepUpright ? { keepUpright: true } : {}),
      });
      toast({ tone: "success", title: "Order created", description: `Tracking number: ${formatTrackingNumber(order.trackingNumber)}` });
      router.push("/merchant/orders");
    } catch (err) {
      if (isApiError(err) && Object.keys(err.fieldErrors).length > 0) {
        const { handled } = applyServerFieldErrors(err, form.setError, SERVER_FIELDS);
        if (!handled) setSubmitError(err.message);
        const fieldStep = getFieldStep(err.fieldErrors);
        if (fieldStep !== null) setStep(fieldStep);
      } else {
        setSubmitError(isApiError(err) ? err.message : "Something went wrong. Try again.");
      }
    }
  }

  return (
    <FormPage title="Create order" backHref="/merchant/orders" backLabel="Orders">
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} />
      </div>
      <form className="flex flex-col gap-12" noValidate onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && <ContactStep prefix="pickup" title="Pickup details" description="Where should the rider collect the parcel?" register={register} control={control} errors={errors.pickup} />}
        {step === 1 && <ContactStep prefix="recipient" title="Recipient details" description="Where should the parcel be delivered?" register={register} control={control} errors={errors.recipient} />}
        {step === 2 && <ParcelStep register={register} control={control} errors={errors} />}
        {step === 3 && <ReviewStep values={getValues()} submitError={submitError} />}

        <FormActions>
          {step < 3 ? (
            <>
              <Button type="button" onClick={goNext}>Next</Button>
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              {step === 0 && (
                <Button type="button" variant="secondary" asChild>
                  <a href="/merchant/orders">Cancel</a>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="submit" loading={isSubmitting}>Submit order</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
            </>
          )}
        </FormActions>
      </form>
    </FormPage>
  );
}

/* ---- Contact step (shared for pickup and recipient) ---- */

function ContactStep({
  prefix,
  title,
  description,
  register,
  control,
  errors,
}: {
  prefix: "pickup" | "recipient";
  title: string;
  description: string;
  register: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["register"];
  control: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["control"];
  errors: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["formState"]["errors"]["pickup"];
}) {
  const districts = useDistricts();

  return (
    <FormSection title={title} description={description}>
      <FormField id={`${prefix}-name`} label="Full name" error={errors?.name?.message}>
        {(ctrl) => (
          <Input {...ctrl} size="md" {...register(`${prefix}.name` as Path<CreateOrderInput>)} placeholder="e.g. Kasun Perera" />
        )}
      </FormField>

      <FormField id={`${prefix}-phone`} label="Mobile number" error={errors?.phone?.message}>
        {(ctrl) => (
          <Controller
            name={`${prefix}.phone` as Path<CreateOrderInput>}
            control={control}
            render={({ field }) => (
              <PhoneInput {...ctrl} size="md" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} placeholder="77 123 4567" />
            )}
          />
        )}
      </FormField>

      <FormField id={`${prefix}-address`} label="Address" error={errors?.addressLine?.message}>
        {(ctrl) => (
          <Input {...ctrl} size="md" {...register(`${prefix}.addressLine` as Path<CreateOrderInput>)} placeholder="No. 12, Main Street" />
        )}
      </FormField>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField id={`${prefix}-city`} label="City or town" error={errors?.city?.message}>
          {(ctrl) => (
            <Input {...ctrl} size="md" {...register(`${prefix}.city` as Path<CreateOrderInput>)} placeholder="e.g. Nugegoda" />
          )}
        </FormField>

        <FormField id={`${prefix}-district`} label="District" error={errors?.district?.message}>
          {(ctrl) => (
            <Controller
              name={`${prefix}.district` as Path<CreateOrderInput>}
              control={control}
              render={({ field }) => (
                <Select {...ctrl} size="md" value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} disabled={districts.status === "loading"}>
                  <option value="">Select a district</option>
                  {districts.districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name ?? humanizeCode(d.code)}
                    </option>
                  ))}
                </Select>
              )}
            />
          )}
        </FormField>
      </div>
    </FormSection>
  );
}

/* ---- Parcel step ---- */

function ParcelStep({
  register,
  control,
  errors,
}: {
  register: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["register"];
  control: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["control"];
  errors: ReturnType<typeof useForm<CreateOrderInput, unknown, CreateOrderValues>>["formState"]["errors"];
}) {
  return (
    <>
      <FormSection title="Parcel details" description="Enter the parcel weight and packed dimensions.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField id="weightKg" label="Weight (kg)" error={errors.weightKg?.message}>
            {(ctrl) => (
              <Input {...ctrl} size="md" inputMode="decimal" {...register("weightKg")} placeholder="e.g. 1.5" />
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField id="lengthCm" label="Length (cm)" error={errors.lengthCm?.message}>
            {(ctrl) => <Input {...ctrl} size="md" inputMode="numeric" {...register("lengthCm")} placeholder="40" />}
          </FormField>
          <FormField id="widthCm" label="Width (cm)" error={errors.widthCm?.message}>
            {(ctrl) => <Input {...ctrl} size="md" inputMode="numeric" {...register("widthCm")} placeholder="30" />}
          </FormField>
          <FormField id="heightCm" label="Height (cm)" error={errors.heightCm?.message}>
            {(ctrl) => <Input {...ctrl} size="md" inputMode="numeric" {...register("heightCm")} placeholder="12" />}
          </FormField>
        </div>

        <Controller
          name="keepUpright"
          control={control}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-3 text-body-sm text-grey-700">
              <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} id="keepUpright" />
              Keep upright — do not lay this parcel on its side
            </label>
          )}
        />
      </FormSection>

      <FormSection title="Cash on delivery" description="Leave blank if the parcel is already paid for.">
        <FormField id="codAmount" label="Amount to collect" labelHint="(optional)" error={errors.codAmount?.message}>
          {(ctrl) => (
            <Input {...ctrl} size="md" inputMode="decimal" {...register("codAmount")} placeholder="e.g. 2500.00" />
          )}
        </FormField>
      </FormSection>

      <FormSection title="Extra details" description="Optional.">
        <FormField id="merchantOrderRef" label="Your order reference" labelHint="(optional)" error={errors.merchantOrderRef?.message}
          helper="Your own order or invoice number for this parcel.">
          {(ctrl) => (
            <Input {...ctrl} size="md" {...register("merchantOrderRef")} placeholder="e.g. ORD-00123" maxLength={100} />
          )}
        </FormField>

        <FormField id="instructions" label="Delivery instructions" labelHint="(optional)" error={errors.instructions?.message}>
          {(ctrl) => (
            <Textarea {...ctrl} {...register("instructions")} placeholder="e.g. Call before arriving. Gate code is 1234." rows={3} />
          )}
        </FormField>
      </FormSection>
    </>
  );
}

/* ---- Review step ---- */

function ReviewStep({
  values,
  submitError,
}: {
  values: CreateOrderInput;
  submitError: string | undefined;
}) {
  const districts = useDistricts();

  const districtName = (code: string) =>
    districts.districts.find((d) => d.code === code)?.name ?? humanizeCode(code);

  const pickupDistrict = values.pickup.district;
  const recipientDistrict = values.recipient.district;
  const weightKg = Number(values.weightKg) || 0;
  const lengthCm = Number(values.lengthCm) || 0;
  const widthCm = Number(values.widthCm) || 0;
  const heightCm = Number(values.heightCm) || 0;
  const codAmount = values.codAmount === "" ? null : Number(values.codAmount) || null;

  const feeRequest: FeeEstimateRequest = {
    pickupDistrict: pickupDistrict,
    dropOffDistrict: recipientDistrict,
    weightKg,
    ...(lengthCm > 0 && widthCm > 0 && heightCm > 0 ? { lengthCm, widthCm, heightCm } : {}),
    keepUpright: values.keepUpright,
    cashOnDelivery: codAmount !== null,
  };

  const { state: feeState, retry: retryFee } = useFeeEstimate(feeRequest);

  return (
    <>
      <FormSection title="Order summary">
        <Card>
          <CardContent className="grid gap-4 text-body-sm">
            <SummaryRow label="Pickup" value={`${values.pickup.name} · ${values.pickup.city}, ${districtName(pickupDistrict)}`} />
            <SummaryRow label="Recipient" value={`${values.recipient.name} · ${values.recipient.city}, ${districtName(recipientDistrict)}`} />
            <SummaryRow label="Weight" value={`${weightKg} kg`} />
            {lengthCm > 0 && <SummaryRow label="Dimensions" value={`${lengthCm} × ${widthCm} × ${heightCm} cm`} />}
            {values.keepUpright && <SummaryRow label="Handling" value="Keep upright" />}
            {codAmount !== null && <SummaryRow label="Cash on delivery" value={formatRs(codAmount)} />}
            {values.merchantOrderRef && <SummaryRow label="Your reference" value={values.merchantOrderRef} />}
            {values.instructions && <SummaryRow label="Instructions" value={values.instructions} />}
          </CardContent>
        </Card>
      </FormSection>

      <FormSection title="Estimated fee">
        <FeeEstimateSummary state={feeState} onRetry={retryFee} />
      </FormSection>

      {submitError ? (
        <InlineNotice tone="error" title="We couldn&apos;t create the order">
          {submitError}
        </InlineNotice>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-grey-600">{label}</span>
      <span className="text-right text-grey-900">{value}</span>
    </div>
  );
}

function FeeEstimateSummary({
  state,
  onRetry,
}: {
  state: ReturnType<typeof useFeeEstimate>["state"];
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2" aria-busy="true" aria-label="Working out the fee">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn&apos;t estimate the fee">
        {state.message}{" "}
        <Button type="button" variant="link" onClick={onRetry}>
          Try again
        </Button>
      </InlineNotice>
    );
  }

  const { estimate } = state;

  if (estimate.total === null) {
    return (
      <InlineNotice tone="info" title="Needs a manual quote">
        This parcel is too large or heavy for our standard rates. We&apos;ll contact you after the order is submitted.
      </InlineNotice>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-grey-600">Estimated fee</p>
          <p className="text-h1 tabular-nums text-grey-900">{formatRs(estimate.total)}</p>
          <p className="text-body-sm text-grey-600">Charged for {estimate.billableWeightKg} kg</p>
        </div>
        <p className="text-body-sm text-grey-500">Final fee confirmed at pickup</p>
      </CardContent>
    </Card>
  );
}

/* ---- Helper to jump back to the step that has server field errors ---- */

function getFieldStep(fieldErrors: Record<string, string>): number | null {
  const keys = Object.keys(fieldErrors);
  if (keys.some((k) => k.startsWith("pickup."))) return 0;
  if (keys.some((k) => k.startsWith("recipient."))) return 1;
  if (keys.some((k) => ["weightKg", "lengthCm", "widthCm", "heightCm", "codAmount", "instructions"].includes(k))) return 2;
  return null;
}
