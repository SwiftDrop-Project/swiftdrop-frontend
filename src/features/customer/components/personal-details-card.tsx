"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatPhone } from "@/lib/format";
import { isApiError } from "@/lib/api";
import { customerApi } from "../api";
import { personalDetailsSchema, type PersonalDetailsFormData } from "../schemas";
import type { CustomerProfileResponse } from "../types";

export function PersonalDetailsCard({
  profile,
  onProfileUpdated,
}: {
  profile: CustomerProfileResponse;
  onProfileUpdated: (updated: CustomerProfileResponse) => void;
}) {
  const [rootError, setRootError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      fullName: profile.fullName,
      phone: profile.phone ? formatPhone(profile.phone) : "",
    },
  });

  React.useEffect(() => {
    reset({
      fullName: profile.fullName,
      phone: profile.phone ? formatPhone(profile.phone) : "",
    });
  }, [profile.fullName, profile.phone, reset]);

  async function onSubmit(data: PersonalDetailsFormData) {
    setRootError(null);
    try {
      const updated = await customerApi.updatePersonalDetails({
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
      });
      onProfileUpdated(updated);
      reset({
        fullName: updated.fullName,
        phone: updated.phone ? formatPhone(updated.phone) : "",
      });
      toast({
        tone: "success",
        title: "Changes saved",
        description: "Your personal details have been updated.",
      });
    } catch (error) {
      if (isApiError(error)) {
        if (error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            if (field === "fullName" || field === "phone") {
              setError(field, { message });
            }
          }
        }
        setRootError(error.message);
      } else {
        setRootError("Failed to update personal details. Please try again.");
      }
    }
  }

  function handleCancel() {
    reset({
      fullName: profile.fullName,
      phone: profile.phone ? formatPhone(profile.phone) : "",
    });
    setRootError(null);
  }

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <h3 className="text-h3 font-semibold text-grey-900">Personal details</h3>

        {rootError && (
          <InlineNotice tone="error" title="We couldn't save your changes" className="mt-4">
            {rootError}
          </InlineNotice>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-5">
          <FormField
            id="profile-fullName"
            label="Full name"
            error={errors.fullName?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register("fullName")}
                size="md"
                placeholder="Full name"
                autoComplete="name"
              />
            )}
          </FormField>

          <FormField
            id="profile-email"
            label="Email"
            helper="Your email is your sign-in and can't be changed here."
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                size="md"
                value={profile.email}
                disabled
                className="bg-grey-50 text-grey-600"
              />
            )}
          </FormField>

          <FormField
            id="profile-phone"
            label="Mobile number"
            error={errors.phone?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register("phone")}
                type="tel"
                size="md"
                placeholder="+94 77 123 4567"
                autoComplete="tel"
                className="tabular-nums"
              />
            )}
          </FormField>

          <div className="mt-2 flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Save changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting || !isDirty}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
