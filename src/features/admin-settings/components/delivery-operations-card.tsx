
"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type DeliverySettings = {
  pickupStart: string;
  pickupEnd: string;
  sameDayCutoff: string;
  maxWeightKg: string;
  maxLengthCm: string;
  maxWidthCm: string;
  maxHeightCm: string;
  failedAttempts: string;
  operatingDays: string[];
};

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const initialSettings: DeliverySettings = {
  pickupStart: "08:00",
  pickupEnd: "18:00",
  sameDayCutoff: "12:00",
  maxWeightKg: "",
  maxLengthCm: "",
  maxWidthCm: "",
  maxHeightCm: "",
  failedAttempts: "3",
  operatingDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};

export function DeliveryOperationsCard() {
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(field: keyof DeliverySettings, value: string) {
    setSettings((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  }

  function toggleDay(day: string) {
    setSettings((previous) => ({
      ...previous,
      operatingDays: previous.operatingDays.includes(day)
        ? previous.operatingDays.filter((item) => item !== day)
        : [...previous.operatingDays, day],
    }));
    setErrors((previous) => ({ ...previous, operatingDays: "" }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (settings.pickupStart >= settings.pickupEnd) {
      nextErrors.pickupEnd = "Pickup end time must be after start time.";
    }

    if (
      settings.sameDayCutoff < settings.pickupStart ||
      settings.sameDayCutoff > settings.pickupEnd
    ) {
      nextErrors.sameDayCutoff =
        "Cut-off time must be within pickup hours.";
    }

    if (settings.operatingDays.length === 0) {
      nextErrors.operatingDays = "Select at least one operating day.";
    }

    if (!Number.isInteger(Number(settings.failedAttempts)) ||
        Number(settings.failedAttempts) < 1) {
      nextErrors.failedAttempts = "Enter at least one delivery attempt.";
    }

    for (const field of [
      "maxWeightKg",
      "maxLengthCm",
      "maxWidthCm",
      "maxHeightCm",
    ] as const) {
      const value = settings[field];
      if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
        nextErrors[field] = "Enter a number greater than zero.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    // Settings API is not connected yet.
    // Do not claim these values have been saved.
  }

  return (
    <Card>
      <CardHeader
        title="Delivery Operations"
        description="Configure pickup schedules, operating days, and delivery limits."
      />

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField id="pickup-start" label="Pickup start time">
              {(control) => (
                <Input
                  {...control}
                  type="time"
                  size="md"
                  value={settings.pickupStart}
                  onChange={(event) =>
                    updateField("pickupStart", event.target.value)
                  }
                />
              )}
            </FormField>

            <FormField
              id="pickup-end"
              label="Pickup end time"
              error={errors.pickupEnd}
            >
              {(control) => (
                <Input
                  {...control}
                  type="time"
                  size="md"
                  value={settings.pickupEnd}
                  onChange={(event) =>
                    updateField("pickupEnd", event.target.value)
                  }
                />
              )}
            </FormField>
          </div>

          <FormField
            id="same-day-cutoff"
            label="Same-day pickup cut-off"
            error={errors.sameDayCutoff}
          >
            {(control) => (
              <Input
                {...control}
                type="time"
                size="md"
                value={settings.sameDayCutoff}
                onChange={(event) =>
                  updateField("sameDayCutoff", event.target.value)
                }
              />
            )}
          </FormField>

          <div className="flex flex-col gap-3">
            <p className="text-label text-grey-900">Operating days</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {days.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 text-body-sm text-grey-800"
                >
                  <Checkbox
                    checked={settings.operatingDays.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>

            {errors.operatingDays && (
              <p className="text-body-sm text-error">
                {errors.operatingDays}
              </p>
            )}

            <p className="text-body-sm text-grey-600">
              Public holidays and Poya days require separate scheduling rules.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              id="max-weight"
              label="Maximum parcel weight (kg)"
              error={errors.maxWeightKg}
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  size="md"
                  min="0"
                  step="0.1"
                  value={settings.maxWeightKg}
                  onChange={(event) =>
                    updateField("maxWeightKg", event.target.value)
                  }
                  placeholder="Set by pricing rules"
                />
              )}
            </FormField>

            <FormField
              id="failed-attempts"
              label="Failed attempts before return"
              error={errors.failedAttempts}
            >
              {(control) => (
                <Select
                  {...control}
                  size="md"
                  value={settings.failedAttempts}
                  onChange={(event) =>
                    updateField("failedAttempts", event.target.value)
                  }
                >
                  {[1, 2, 3, 4, 5].map((number) => (
                    <option key={number} value={number}>
                      {number} {number === 1 ? "attempt" : "attempts"}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-h3 text-grey-900">
              Maximum parcel dimensions (cm)
            </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {([
                ["maxLengthCm", "Length"],
                ["maxWidthCm", "Width"],
                ["maxHeightCm", "Height"],
              ] as const).map(([field, label]) => (
                <FormField
                  key={field}
                  id={field}
                  label={label}
                  error={errors[field]}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      size="md"
                      min="0"
                      step="0.1"
                      value={settings[field]}
                      onChange={(event) =>
                        updateField(field, event.target.value)
                      }
                      placeholder="Not configured"
                    />
                  )}
                </FormField>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-grey-200 pt-6">
            <Button type="submit" disabled>
              Save delivery operations
            </Button>
          </div>

          <p className="text-body-sm text-grey-600">
            Saving will be available after the settings API is connected.
            Parcel limits must match the pricing module.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
