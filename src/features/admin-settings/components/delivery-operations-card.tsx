
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  deliverySettingsApi,
  type DeliverySettings as DeliverySettingsPayload,
} from "../api";

type DeliveryForm = {
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

const initialSettings: DeliveryForm = {
  pickupStart: "08:00",
  pickupEnd: "18:00",
  sameDayCutoff: "12:00",
  maxWeightKg: "",
  maxLengthCm: "",
  maxWidthCm: "",
  maxHeightCm: "",
  failedAttempts: "3",
  operatingDays: days.slice(0, 6),
};

function toForm(data: DeliverySettingsPayload): DeliveryForm {
  return {
    pickupStart: data.pickupStart.slice(0, 5),
    pickupEnd: data.pickupEnd.slice(0, 5),
    sameDayCutoff: data.sameDayCutoff.slice(0, 5),
    maxWeightKg: data.maxWeightKg?.toString() ?? "",
    maxLengthCm: data.maxLengthCm?.toString() ?? "",
    maxWidthCm: data.maxWidthCm?.toString() ?? "",
    maxHeightCm: data.maxHeightCm?.toString() ?? "",
    failedAttempts: data.failedAttempts.toString(),
    operatingDays: data.operatingDays,
  };
}

function toPayload(form: DeliveryForm): DeliverySettingsPayload {
  const optionalNumber = (value: string) =>
    value.trim() === "" ? null : Number(value);

  return {
    pickupStart: form.pickupStart,
    pickupEnd: form.pickupEnd,
    sameDayCutoff: form.sameDayCutoff,
    operatingDays: form.operatingDays,
    maxWeightKg: optionalNumber(form.maxWeightKg),
    maxLengthCm: optionalNumber(form.maxLengthCm),
    maxWidthCm: optionalNumber(form.maxWidthCm),
    maxHeightCm: optionalNumber(form.maxHeightCm),
    failedAttempts: Number(form.failedAttempts),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function DeliveryOperationsCard() {
  const [settings, setSettings] = useState<DeliveryForm>(initialSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const data = await deliverySettingsApi.get();

        if (active) {
          setSettings(toForm(data));
        }
      } catch (error: unknown) {
        if (!active) return;

        // First-time setup: no saved row exists yet.
        const status =
          error && typeof error === "object" && "status" in error
            ? error.status
            : undefined;

        if (status !== 404) {
          setApiError(getErrorMessage(error));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof DeliveryForm, value: string) {
    setSettings((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setMessage("");
    setApiError("");
  }

  function toggleDay(day: string) {
    setSettings((previous) => ({
      ...previous,
      operatingDays: previous.operatingDays.includes(day)
        ? previous.operatingDays.filter((item) => item !== day)
        : days.filter(
            (item) =>
              previous.operatingDays.includes(item) || item === day
          ),
    }));

    setErrors((previous) => ({ ...previous, operatingDays: "" }));
    setMessage("");
    setApiError("");
  }

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!settings.pickupStart || !settings.pickupEnd) {
      nextErrors.pickupEnd = "Select valid pickup hours.";
    } else if (settings.pickupStart >= settings.pickupEnd) {
      nextErrors.pickupEnd =
        "Pickup end time must be after start time.";
    }

    if (
      !settings.sameDayCutoff ||
      settings.sameDayCutoff < settings.pickupStart ||
      settings.sameDayCutoff > settings.pickupEnd
    ) {
      nextErrors.sameDayCutoff =
        "Cut-off time must be within pickup hours.";
    }

    if (settings.operatingDays.length === 0) {
      nextErrors.operatingDays =
        "Select at least one operating day.";
    }

    const attempts = Number(settings.failedAttempts);

    if (
      !Number.isInteger(attempts) ||
      attempts < 1 ||
      attempts > 5
    ) {
      nextErrors.failedAttempts =
        "Select between 1 and 5 delivery attempts.";
    }

    for (const field of [
      "maxWeightKg",
      "maxLengthCm",
      "maxWidthCm",
      "maxHeightCm",
    ] as const) {
      const value = settings[field].trim();

      if (
        value !== "" &&
        (!Number.isFinite(Number(value)) || Number(value) <= 0)
      ) {
        nextErrors[field] =
          "Enter a number greater than zero.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || saving || !validate()) return;

    setSaving(true);
    setMessage("");
    setApiError("");

    try {
      const saved = await deliverySettingsApi.update(
        toPayload(settings)
      );

      setSettings(toForm(saved));
      setMessage("Delivery operations saved successfully!");
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Delivery Operations"
        description="Configure pickup schedules, operating days, and delivery limits."
      />

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {loading && (
            <p className="text-body-sm text-grey-600">
              Loading delivery settings...
            </p>
          )}

          {message && (
            <p role="status" className="text-body-sm text-green-700">
              {message}
            </p>
          )}

          {apiError && (
            <p role="alert" className="text-body-sm text-error">
              {apiError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              id="pickup-start"
              label="Pickup start time"
            >
              {(control) => (
                <Input
                  {...control}
                  type="time"
                  size="md"
                  value={settings.pickupStart}
                  onChange={(event) =>
                    updateField("pickupStart", event.target.value)
                  }
                  disabled={loading || saving}
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
                  disabled={loading || saving}
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
                disabled={loading || saving}
              />
            )}
          </FormField>

          <div className="flex flex-col gap-3">
            <p className="text-label text-grey-900">
              Operating days
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {days.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 text-body-sm text-grey-800"
                >
                  <input
                    type="checkbox"
                    checked={settings.operatingDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    disabled={loading || saving}
                    className="accent-orange-600"
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
              Public holidays and Poya days require separate
              scheduling rules.
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
                  disabled={loading || saving}
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
                  disabled={loading || saving}
                >
                  {[1, 2, 3, 4, 5].map((number) => (
                    <option key={number} value={number}>
                      {number}{" "}
                      {number === 1 ? "attempt" : "attempts"}
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
                      disabled={loading || saving}
                      placeholder="Not configured"
                    />
                  )}
                </FormField>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-grey-200 pt-6">
            <Button
              type="submit"
              disabled={loading || saving}
            >
              {saving
                ? "Saving..."
                : "Save delivery operations"}
            </Button>
          </div>

          <p className="text-body-sm text-grey-600">
            Parcel limits must match the pricing module.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
