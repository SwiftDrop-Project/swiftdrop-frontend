"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { flushSync } from "react-dom";
import { Controller, useForm, type Control, type FieldErrors, type Path, type UseFormRegister } from "react-hook-form";
import { FormActions, FormSection } from "@/components/layout/form-page";
import { PageColumns } from "@/components/layout/page-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { TextButton } from "@/components/ui/text-link";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/identity";
import { useFeeEstimate, type FeeEstimateRequest } from "@/features/pricing";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatPhone, formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { deliveryApi } from "../api";
import { sizeText } from "../labels";
import { deliveryHref } from "../routes";
import { createDeliverySchema, type CreateDeliveryInput, type CreateDeliveryValues } from "../schemas";
import type { Delivery, ParcelSize } from "../types";
import { FeeEstimateCard } from "./fee-estimate-card";
import { SummaryCard } from "./summary-card";

const STEPS = [{ label: "Details" }, { label: "Review" }];
const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

type Step = "details" | "review" | "done";
type ContactKey = "pickup" | "recipient";

const EMPTY_CONTACT = { name: "", phone: "", addressLine: "", city: "", district: "" };

/** Every field the API may name in fieldErrors; the paths match the form (e.g. "pickup.phone"). */
const SERVER_FIELDS: readonly Path<CreateDeliveryInput>[] = [
  ...(["pickup", "recipient"] as const).flatMap((key) =>
    (["name", "phone", "addressLine", "city", "district"] as const).map((field) => `${key}.${field}` as const),
  ),
  "weightKg",
  "lengthCm",
  "widthCm",
  "heightCm",
  "codAmount",
  "instructions",
];

/** "+94771234567" → "77 123 4567", for the input that already shows the +94 prefix. */
function localPhone(stored: string): string {
  return stored.replace(/^\+94/, "").replace(/^(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/** A phone as typed ("077 123 4567", "77…", "+9477…") → "+94 77 123 4567". */
function displayPhone(typed: string): string {
  return formatPhone(`+94${typed.replace(/\s+/g, "").replace(/^(?:\+94|0)/, "")}`);
}

/** An empty form, with the pickup name and phone set to the customer's own. */
function startValues(user: { fullName: string; phone: string | null } | null): CreateDeliveryInput {
  return {
    pickup: { ...EMPTY_CONTACT, name: user?.fullName ?? "", phone: user?.phone ? localPhone(user.phone) : "" },
    recipient: { ...EMPTY_CONTACT },
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    keepUpright: false,
    codAmount: "",
    instructions: "",
  };
}

/** The size as typed, as numbers. Only used once the form is valid (the review step). */
function sizeOf(values: CreateDeliveryInput): ParcelSize {
  return {
    lengthCm: Number(values.lengthCm),
    widthCm: Number(values.widthCm),
    heightCm: Number(values.heightCm),
    keepUpright: values.keepUpright,
  };
}

/** The estimate for what is about to be booked: the same route, weight, size and cash on delivery. */
function estimateRequest(values: CreateDeliveryInput): FeeEstimateRequest {
  return {
    pickupDistrict: values.pickup.district,
    dropOffDistrict: values.recipient.district,
    weightKg: Number(values.weightKg),
    ...sizeOf(values),
    cashOnDelivery: values.codAmount.trim() !== "",
  };
}

/**
 * Create delivery (POST /deliveries) for a logged-in customer: the details form, a review of what will be
 * booked with the estimated fee, then the tracking number and the fee. The form keeps its values while the
 * customer moves between the steps, and a server validation error takes them back to the field it is about.
 */
export function CreateDelivery() {
  const user = useCurrentUser();
  const districts = useDistricts();
  const [step, setStep] = React.useState<Step>("details");
  const [created, setCreated] = React.useState<Delivery | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeliveryInput, unknown, CreateDeliveryValues>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: startValues(null),
  });

  // GET /auth/me may finish after the form is shown: fill the pickup only if the customer hasn't typed there.
  React.useEffect(() => {
    if (!user) return;
    if (getValues("pickup.name") === "") setValue("pickup.name", user.fullName);
    if (user.phone && getValues("pickup.phone") === "") setValue("pickup.phone", localPhone(user.phone));
  }, [user, getValues, setValue]);

  const districtName = React.useCallback(
    (code: string) => districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code),
    [districts.districts],
  );

  const goToReview = handleSubmit(() => {
    setNotice(null);
    setStep("review");
    window.scrollTo({ top: 0 });
  });

  const createDelivery = handleSubmit(async (values) => {
    setNotice(null);
    try {
      setCreated(await deliveryApi.create(values));
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_FAILED") {
        // Show the fields again first, so the errors can sit under them and the first one gets the focus.
        flushSync(() => setStep("details"));
        const { handled, unmatched } = applyServerFieldErrors(error, setError, SERVER_FIELDS);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched.length > 0 ? unmatched.join(" ") : error.message);
        return;
      }
      // Also 409 PARCEL_NEEDS_MANUAL_QUOTE: no vehicle carries or fits the parcel.
      setNotice(isApiError(error) ? error.message : UNKNOWN_ERROR);
    }
  });

  const startAnother = () => {
    reset(startValues(user));
    setCreated(null);
    setNotice(null);
    setStep("details");
    window.scrollTo({ top: 0 });
  };

  if (step === "done" && created) {
    return <DeliveryCreated delivery={created} onCreateAnother={startAnother} />;
  }

  const districtPlaceholder =
    districts.status === "loading"
      ? "Loading districts…"
      : districts.status === "error"
        ? "Couldn't load districts"
        : "Select a district";

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STEPS} current={step === "details" ? 0 : 1} className="max-w-form-app" />

      {notice ? (
        <InlineNotice tone="error" title="We couldn't create the delivery" className="max-w-form-app">
          {notice}
        </InlineNotice>
      ) : null}

      {step === "details" ? (
        <form onSubmit={goToReview} noValidate className="flex max-w-form-app flex-col gap-12">
          {(["pickup", "recipient"] as const).map((key) => (
            <ContactFields
              key={key}
              contact={key}
              register={register}
              errors={errors}
              districts={districts}
              districtPlaceholder={districtPlaceholder}
            />
          ))}

          <FormSection title="Parcel">
            <FormField id="weightKg" label="Weight (kg)" helper="Up to 50 kg." error={errors.weightKg?.message}>
              {(a11y) => <Input {...a11y} {...register("weightKg")} inputMode="decimal" placeholder="e.g. 2.5" />}
            </FormField>

            <SizeFields register={register} errors={errors} control={control} />

            <FormField
              id="codAmount"
              label="Cash on delivery (Rs.)"
              labelHint="(optional)"
              helper="Cash the courier collects from the recipient. Leave it empty if the parcel is paid for."
              error={errors.codAmount?.message}
            >
              {(a11y) => <Input {...a11y} {...register("codAmount")} inputMode="decimal" placeholder="e.g. 2500" />}
            </FormField>

            <FormField
              id="instructions"
              label="Instructions for the courier"
              labelHint="(optional)"
              error={errors.instructions?.message}
            >
              {(a11y) => (
                <Textarea {...a11y} {...register("instructions")} placeholder="e.g. Call before coming" />
              )}
            </FormField>
          </FormSection>

          <FormActions>
            <Button type="submit">Continue</Button>
            <Button asChild variant="secondary">
              <Link href="/customer">Cancel</Link>
            </Button>
          </FormActions>
        </form>
      ) : (
        <ReviewStep
          values={getValues()}
          districtName={districtName}
          submitting={isSubmitting}
          onCreate={createDelivery}
          onEdit={() => setStep("details")}
        />
      )}
    </div>
  );
}

interface ReviewStepProps {
  values: CreateDeliveryInput;
  districtName: (code: string) => string;
  submitting: boolean;
  onCreate: React.FormEventHandler<HTMLFormElement>;
  onEdit: () => void;
}

/**
 * What will be booked, with the fee estimate (POST /pricing/estimate) beside it on wide screens (sticky while
 * scrolling) and above the buttons on smaller ones, so it is always seen before "Create delivery". A parcel that
 * needs a manual quote can't be booked here, so the button is off.
 */
function ReviewStep({ values, districtName, submitting, onCreate, onEdit }: ReviewStepProps) {
  const { state: estimate, retry } = useFeeEstimate(estimateRequest(values));
  const needsQuote = estimate.status === "ready" && estimate.estimate.status === "MANUAL_QUOTE";
  const cod = values.codAmount.trim();
  const feeCard = (
    <FeeEstimateCard
      estimate={estimate}
      onRetry={retry}
      pickup={{ district: districtName(values.pickup.district), city: values.pickup.city }}
      dropOff={{ district: districtName(values.recipient.district), city: values.recipient.city }}
      weightKg={Number(values.weightKg)}
      size={sizeText(sizeOf(values))}
      codAmount={cod === "" ? null : Number(cod)}
    />
  );

  return (
    <PageColumns aside={<div className="hidden xl:sticky xl:top-24 xl:block">{feeCard}</div>}>
      <form onSubmit={onCreate} noValidate className="flex flex-col gap-6">
        <ReviewDetails values={values} districtName={districtName} />

        <div className="xl:hidden">{feeCard}</div>

        <FormActions>
          <Button type="submit" loading={submitting} disabled={needsQuote}>
            Create delivery
          </Button>
          <Button type="button" variant="secondary" disabled={submitting} onClick={onEdit}>
            Edit details
          </Button>
        </FormActions>
      </form>
    </PageColumns>
  );
}

interface ContactFieldsProps {
  contact: ContactKey;
  register: UseFormRegister<CreateDeliveryInput>;
  errors: FieldErrors<CreateDeliveryInput>;
  districts: ReturnType<typeof useDistricts>;
  districtPlaceholder: string;
}

const CONTACT_TEXT: Record<ContactKey, { title: string; description: string }> = {
  pickup: { title: "Pickup", description: "Where the courier collects the parcel." },
  recipient: { title: "Recipient", description: "Who gets the parcel, and where." },
};

/** Name, phone, address, city and district of the pickup or the recipient. */
function ContactFields({ contact, register, errors, districts, districtPlaceholder }: ContactFieldsProps) {
  const fieldErrors = errors[contact];
  const { title, description } = CONTACT_TEXT[contact];

  return (
    <FormSection title={title} description={description}>
      <FormField id={`${contact}-name`} label="Name" error={fieldErrors?.name?.message}>
        {(a11y) => <Input {...a11y} {...register(`${contact}.name`)} autoComplete="off" />}
      </FormField>

      <FormField id={`${contact}-phone`} label="Mobile number" error={fieldErrors?.phone?.message}>
        {(a11y) => <PhoneInput {...a11y} {...register(`${contact}.phone`)} placeholder="77 123 4567" />}
      </FormField>

      <FormField id={`${contact}-addressLine`} label="Address" error={fieldErrors?.addressLine?.message}>
        {(a11y) => (
          <Input
            {...a11y}
            {...register(`${contact}.addressLine`)}
            autoComplete="off"
            placeholder="e.g. 12 Galle Road"
          />
        )}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <FormField id={`${contact}-city`} label="City or town" error={fieldErrors?.city?.message}>
          {(a11y) => <Input {...a11y} {...register(`${contact}.city`)} autoComplete="off" placeholder="e.g. Kandy" />}
        </FormField>

        <FormField
          id={`${contact}-district`}
          label="District"
          error={fieldErrors?.district?.message}
          helper={
            districts.status === "error" ? (
              <TextButton onClick={districts.retry}>Try loading districts again</TextButton>
            ) : undefined
          }
        >
          {(a11y) => (
            <Select {...a11y} {...register(`${contact}.district`)} disabled={districts.status !== "ready"}>
              <option value="" disabled>
                {districtPlaceholder}
              </option>
              {districts.districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </FormSection>
  );
}

const SIZE_FIELDS = [
  { name: "lengthCm", label: "Length (cm)", placeholder: "e.g. 40" },
  { name: "widthCm", label: "Width (cm)", placeholder: "e.g. 30" },
  { name: "heightCm", label: "Height (cm)", placeholder: "e.g. 12" },
] as const;

interface SizeFieldsProps {
  register: UseFormRegister<CreateDeliveryInput>;
  errors: FieldErrors<CreateDeliveryInput>;
  control: Control<CreateDeliveryInput, unknown, CreateDeliveryValues>;
}

/**
 * The packed size in whole cm and "Keep upright". Pricing uses them for the billable weight (a large, light parcel
 * is charged by its size) and for the vehicle of the pickup and drop-off legs.
 */
function SizeFields({ register, errors, control }: SizeFieldsProps) {
  return (
    <div role="group" aria-labelledby="size-label" aria-describedby="size-helper" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span id="size-label" className="text-label text-grey-900">
          Packed size
        </span>
        <p id="size-helper" className="text-caption text-grey-600">
          Measure the outside of the packed parcel in whole centimetres. The size decides the vehicle, and a large,
          light parcel is charged by its size.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
        {SIZE_FIELDS.map(({ name, label, placeholder }) => (
          <FormField key={name} id={name} label={label} error={errors[name]?.message}>
            {(a11y) => <Input {...a11y} {...register(name)} inputMode="numeric" placeholder={placeholder} />}
          </FormField>
        ))}
      </div>

      <Controller
        name="keepUpright"
        control={control}
        render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox
              id="keepUpright"
              ref={field.ref}
              name={field.name}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              aria-describedby="keepUpright-helper"
              className="mt-0.5"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="keepUpright" className="cursor-pointer text-body text-grey-700">
                Keep upright
              </label>
              <p id="keepUpright-helper" className="text-caption text-grey-600">
                Tick this if the parcel must not lie on its side, like a cake or a plant.
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}

/** What will be booked, as the customer typed it, before anything is sent. */
function ReviewDetails({
  values,
  districtName,
}: {
  values: CreateDeliveryInput;
  districtName: (code: string) => string;
}) {
  const contactRows = (contact: CreateDeliveryInput["pickup"]) => [
    { label: "Name", value: contact.name },
    { label: "Mobile number", value: displayPhone(contact.phone), tabular: true },
    { label: "Address", value: `${contact.addressLine}, ${contact.city}` },
    { label: "District", value: districtName(contact.district) },
  ];
  const cod = values.codAmount.trim();
  const instructions = values.instructions.trim();

  return (
    <>
      <SummaryCard title="Pickup" rows={contactRows(values.pickup)} />
      <SummaryCard title="Recipient" rows={contactRows(values.recipient)} />
      <SummaryCard
        title="Parcel"
        rows={[
          { label: "Weight", value: `${Number(values.weightKg)} kg`, tabular: true },
          { label: "Packed size", value: sizeText(sizeOf(values)), tabular: true },
          {
            label: "Cash on delivery",
            value: cod === "" ? "None, already paid" : formatRs(Number(cod)),
            tabular: cod !== "",
          },
          { label: "Instructions", value: instructions === "" ? "None" : instructions },
        ]}
      />
    </>
  );
}

/** The last step: the tracking number to keep, with a copy button, and the fee the server set. */
function DeliveryCreated({ delivery, onCreateAnother }: { delivery: Delivery; onCreateAnother: () => void }) {
  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(delivery.trackingNumber);
      toast({ tone: "success", title: "Tracking number copied" });
    } catch {
      toast({ tone: "error", title: "We couldn't copy it", description: "Select the number and copy it yourself." });
    }
  };

  return (
    <div className="flex max-w-form-app flex-col gap-8">
      <Stepper steps={STEPS} current={STEPS.length} />

      <InlineNotice tone="success" title="Delivery created">
        Keep the tracking number to follow the parcel.
      </InlineNotice>

      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-label text-grey-600">Tracking number</span>
            <span className="text-display text-grey-900 tabular-nums">
              {formatTrackingNumber(delivery.trackingNumber)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label text-grey-600">Delivery fee</span>
            <span className="text-body text-grey-900 tabular-nums">{formatRs(delivery.feeAmount)}</span>
          </div>
          <div>
            <Button type="button" variant="secondary" onClick={copyTrackingNumber}>
              <Copy aria-hidden="true" />
              Copy tracking number
            </Button>
          </div>
        </CardContent>
      </Card>

      <FormActions>
        <Button asChild>
          <Link href={deliveryHref(delivery.id)}>View delivery</Link>
        </Button>
        <Button type="button" variant="secondary" onClick={onCreateAnother}>
          Create another delivery
        </Button>
      </FormActions>
    </div>
  );
}
