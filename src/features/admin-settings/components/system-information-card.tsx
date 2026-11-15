
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const systemInformation = [
  { label: "Application version", value: "Not available" },
  { label: "Environment", value: "Not available" },
  { label: "Database status", value: "Not connected" },
  { label: "RabbitMQ status", value: "Not connected" },
  { label: "Outbox relay status", value: "Not available" },
];

export function SystemInformationCard() {
  return (
    <Card>
      <CardHeader
        title="System Information"
        description="View application details and service health."
      />

      <CardContent>
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

        <p className="mt-6 text-body-sm text-grey-600">
          Live system information will appear after the
          administrator-only monitoring API is connected.
        </p>
      </CardContent>
    </Card>
  );
}
