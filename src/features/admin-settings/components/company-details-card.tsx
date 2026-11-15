
"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type CompanyDetails = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  headOfficeAddress: string;
  registrationNumber: string;
};

const initialDetails: CompanyDetails = {
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  headOfficeAddress: "",
  registrationNumber: "",
};

export function CompanyDetailsCard() {
  const [details, setDetails] = useState<CompanyDetails>(initialDetails);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CompanyDetails, string>>
  >({});

  function updateField(field: keyof CompanyDetails, value: string) {
    setDetails((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate() {
    const nextErrors: Partial<Record<keyof CompanyDetails, string>> = {};

    if (!details.companyName.trim()) {
      nextErrors.companyName = "Enter the company name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.supportEmail.trim())) {
      nextErrors.supportEmail =
        "Enter a valid email address, like support@example.com.";
    }

    const phone = details.supportPhone.replace(/[\s()-]/g, "");
    if (!/^(?:\+94|0)?7\d{8}$/.test(phone)) {
      nextErrors.supportPhone =
        "Enter a Sri Lankan mobile number, like 0771234567.";
    }

    if (!details.headOfficeAddress.trim()) {
      nextErrors.headOfficeAddress = "Enter the head office address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    // Backend API integration is pending.
    // Do not show a success message until the server saves these values.
  }

  return (
    <Card>
      <CardHeader
        title="Company Details"
        description="Manage the company information used on receipts, emails, and tracking pages."
      />

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FormField
            id="company-name"
            label="Company name"
            error={errors.companyName}
          >
            {(control) => (
              <Input
                {...control}
                size="md"
                value={details.companyName}
                onChange={(event) =>
                  updateField("companyName", event.target.value)
                }
                placeholder="Enter company name"
              />
            )}
          </FormField>

          <FormField
            id="support-email"
            label="Support email"
            error={errors.supportEmail}
          >
            {(control) => (
              <Input
                {...control}
                size="md"
                type="email"
                value={details.supportEmail}
                onChange={(event) =>
                  updateField("supportEmail", event.target.value)
                }
                placeholder="support@example.com"
              />
            )}
          </FormField>

          <FormField
            id="support-phone"
            label="Support phone"
            error={errors.supportPhone}
            helper="Enter a Sri Lankan mobile number."
          >
            {(control) => (
              <PhoneInput
                {...control}
                size="md"
                value={details.supportPhone}
                onChange={(event) =>
                  updateField("supportPhone", event.target.value)
                }
                placeholder="771234567"
              />
            )}
          </FormField>

          <FormField
            id="head-office-address"
            label="Head office address"
            error={errors.headOfficeAddress}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                value={details.headOfficeAddress}
                onChange={(event) =>
                  updateField("headOfficeAddress", event.target.value)
                }
                placeholder="Enter head office address"
              />
            )}
          </FormField>

          <FormField
            id="registration-number"
            label="Business registration number"
            labelHint="(Optional)"
          >
            {(control) => (
              <Input
                {...control}
                size="md"
                value={details.registrationNumber}
                onChange={(event) =>
                  updateField("registrationNumber", event.target.value)
                }
                placeholder="Enter registration number"
              />
            )}
          </FormField>

          <div className="flex justify-end border-t border-grey-200 pt-6">
            <Button type="submit" disabled>
              Save company details
            </Button>
          </div>

          <p className="text-body-sm text-grey-600">
            Saving will be available after the settings API is connected.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
