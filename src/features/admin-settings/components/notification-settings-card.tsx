
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  notificationSettingsApi,
  type NotificationSettings,
} from "../api";

const initialSettings: NotificationSettings = {
  parcelStatusEmails: true,
  merchantDecisionEmails: true,
  senderName: "",
};

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = error.status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

export function NotificationSettingsCard() {
  const [settings, setSettings] =
    useState<NotificationSettings>(initialSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const data = await notificationSettingsApi.get();

        if (active) {
          setSettings(data);
        }
      } catch (error) {
        if (!active) return;

        if (getErrorStatus(error) !== 404) {
          setErrorMessage(
            "Failed to load notification settings.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateSetting(
    field: keyof NotificationSettings,
    value: boolean | string,
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setErrorMessage("");
  }

  async function handleSave() {
    const senderName = settings.senderName.trim();

    if (!senderName || senderName.length > 100) {
      setErrorMessage(
        "Sender name must contain 1 to 100 characters.",
      );
      setMessage("");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const updated = await notificationSettingsApi.update({
        ...settings,
        senderName,
      });

      setSettings(updated);
      setMessage("Notification settings saved successfully!");
    } catch {
      setErrorMessage(
        "Failed to save notification settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
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
                disabled={loading || saving}
                onCheckedChange={(checked) =>
                  updateSetting(
                    "parcelStatusEmails",
                    checked === true,
                  )
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
                disabled={loading || saving}
                onCheckedChange={(checked) =>
                  updateSetting(
                    "merchantDecisionEmails",
                    checked === true,
                  )
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
                disabled={loading || saving}
                maxLength={100}
                onChange={(event) =>
                  updateSetting(
                    "senderName",
                    event.target.value,
                  )
                }
                placeholder="SwiftDrop Support"
              />
            )}
          </FormField>

          <div className="flex flex-col gap-3 border-t border-grey-200 pt-6">
            <h3 className="text-h3 text-grey-900">
              Test email
            </h3>
            <p className="text-body-sm text-grey-600">
              Send a test notification to the administrator email address.
            </p>

            <div>
              <Button
                type="button"
                variant="secondary"
                disabled
              >
                Send test email
              </Button>
            </div>
          </div>

          <div className="flex justify-end border-t border-grey-200 pt-6">
            <Button
              type="button"
              disabled={loading || saving}
              onClick={handleSave}
            >
              {saving
                ? "Saving..."
                : "Save notification settings"}
            </Button>
          </div>

          {loading && (
            <p className="text-body-sm text-grey-600">
              Loading notification settings...
            </p>
          )}

          {message && (
            <p
              role="status"
              className="text-body-sm text-green-700"
            >
              {message}
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="text-body-sm text-red-600"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
