
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  systemInformationApi,
  type SystemInformation,
} from "../api";

export function SystemInformationCard() {
  const [information, setInformation] =
    useState<SystemInformation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    systemInformationApi
      .get()
      .then((data) => {
        if (active) {
          setInformation(data);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const systemInformation = [
    {
      label: "Application version",
      value: information?.applicationVersion ?? "Not available",
    },
    {
      label: "Environment",
      value: information?.environment ?? "Not available",
    },
    {
      label: "Database status",
      value: information?.databaseStatus ?? "Not available",
    },
    {
      label: "RabbitMQ status",
      value: information?.rabbitMqStatus ?? "Not available",
    },
    {
      label: "Outbox relay status",
      value: information?.outboxRelayStatus ?? "Not available",
    },
  ];

  return (
    <Card>
      <CardHeader
        title="System Information"
        description="View application details and service health."
      />

      <CardContent>
        {loading ? (
          <p className="py-4 text-body-sm text-grey-600">
            Loading system information...
          </p>
        ) : error ? (
          <p className="py-4 text-body-sm text-red-600">
            Unable to load system information.
          </p>
        ) : (
          <dl className="divide-y divide-grey-100">
            {systemInformation.map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="text-label text-grey-900">
                  {item.label}
                </dt>

                <dd className="text-body-sm text-grey-600">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
