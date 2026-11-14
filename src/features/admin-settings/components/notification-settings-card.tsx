
"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NotificationSettings = {
  parcelStatusEmails: boolean;
  merchantDecisionEmails: boolean;
  senderName: string;
};

const initialSettings: NotificationSettings = {
  parcelStatusEmails: true,
  merchantDecisionEmails: true,
  senderName: "",
};

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState(initialSettings);

  function updateSetting(
    field: keyof NotificationSettings,
    value: boolean | string,
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <Card>
      <CardHeader
        title="Notification Settings"
        description="Manage outgoing email preferences and sender information."
      />

      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-h3 text-grey-900">
              Email notifications
            </h3>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={settings.parcelStatusEmails}
                onCheckedChange={(checked) =>
                  updateSetting("parcelStatusEmails", checked === true)
                }
                aria-label="Parcel status emails"
              />
              <span className="flex flex-col gap-1">
                <span className="text-label text-grey-900">
                  Parcel status emails
                </span>
                <span className="text-body-sm text-grey-600">
                  Send updates when a parcel changes delivery status.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={settings.merchantDecisionEmails}
                onCheckedChange={(checked) =>
                  updateSetting("merchantDecisionEmails", checked === true)
                }
                aria-label="Merchant approval and rejection emails"
              />
              <span className="flex flex-col gap-1">
                <span className="text-label text-grey-900">
                  Merchant approval and rejection emails
                </span>
                <span className="text-body-sm text-grey-600">
                  Notify merchants about account approval decisions.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
  checked={true}
  disabled
  className="data-checked:disabled:border-orange-600 data-checked:disabled:bg-orange-600"
  aria-label="Password reset security emails always enabled"
/>
              <span className="flex flex-col gap-1">
                <span className="text-label text-grey-900">
                  Password reset security emails
                </span>
                <span className="text-body-sm text-grey-600">
                  Always enabled for account security.
                </span>
              </span>
            </label>
          </div>

          <FormField
            id="notification-sender-name"
            label="Outgoing sender name"
            helper="This name appears as the sender of system emails."
          >
            {(control) => (
              <Input
                {...control}
                size="md"
                value={settings.senderName}
                onChange={(event) =>
                  updateSetting("senderName", event.target.value)
                }
                placeholder="SwiftDrop Support"
              />
            )}
          </FormField>

          <div className="flex flex-col gap-3 border-t border-grey-200 pt-6">
            <h3 className="text-h3 text-grey-900">Test email</h3>
            <p className="text-body-sm text-grey-600">
              Send a test notification to the administrator email address.
            </p>

            <div>
              <Button type="button" variant="secondary" disabled>
                Send test email
              </Button>
            </div>
          </div>

          <div className="flex justify-end border-t border-grey-200 pt-6">
            <Button type="button" disabled>
              Save notification settings
            </Button>
          </div>

          <p className="text-body-sm text-grey-600">
            Saving and test emails will be available after the notification
            settings API is connected. Current values are UI examples only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
