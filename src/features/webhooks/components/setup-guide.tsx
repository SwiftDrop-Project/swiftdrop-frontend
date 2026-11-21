"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { apiUrl } from "@/lib/api";
import { WEBHOOK_EVENT_DESCRIPTION, WEBHOOK_EVENT_LABEL, WEBHOOK_EVENT_TYPES } from "../labels";

/*
 * Static content from API.md "Merchant Orders (WP5)" and "Webhooks (WP6)": the whole integration in the order a
 * developer builds it. The shop sends orders with its API key (setting its own order number), and webhooks report
 * back on those orders: what arrives, the headers, how to check the signature and the rules.
 */

/** Shown until SwiftDrop runs at its real web address. */
const PLACEHOLDER_ORDERS_URL = "https://<your SwiftDrop address>/api/v1/merchant/orders";

/**
 * Where the API-key examples send orders: SwiftDrop's address from NEXT_PUBLIC_API_URL once it's hosted. A local
 * address (localhost, 127.0.0.1) is never shown to merchants: they see the placeholder instead.
 */
function ordersUrl(): string {
  try {
    const url = apiUrl("/merchant/orders");
    const host = new URL(url).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return PLACEHOLDER_ORDERS_URL;
    return url;
  } catch {
    return PLACEHOLDER_ORDERS_URL;
  }
}

const ORDER_BODY = `{
  "merchantOrderRef": "TECH-ORD-1001",
  "pickup":    { "name": "Lanka Crafts", "phone": "077 123 4567", "addressLine": "12 High Level Road",
                 "city": "Nugegoda", "district": "COLOMBO" },
  "recipient": { "name": "Nimal Perera", "phone": "0719876543", "addressLine": "45 Peradeniya Road",
                 "city": "Kandy", "district": "KANDY" },
  "weightKg": 1.5,
  "codAmount": 2500.00,
  "lengthCm": 30,
  "widthCm": 20,
  "heightCm": 10
}`;

function orderSamples(url: string): { value: string; label: string; code: string }[] {
  return [
    {
      value: "curl",
      label: "curl",
      code: `curl -X POST "${url}" \\
  -H "X-Api-Key: $SWIFTDROP_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${ORDER_BODY.replaceAll("\n", "\n  ")}'`,
    },
    {
      value: "node",
      label: "Node.js",
      code: `// On your server only: never put the API key in a browser or mobile app.
const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "X-Api-Key": process.env.SWIFTDROP_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    merchantOrderRef: order.number, // your own order number: webhooks send it back
    pickup: { name: "Lanka Crafts", phone: "077 123 4567", addressLine: "12 High Level Road",
              city: "Nugegoda", district: "COLOMBO" },
    recipient: order.recipient, // { name, phone, addressLine, city, district }
    weightKg: order.weightKg,
    lengthCm: order.lengthCm, widthCm: order.widthCm, heightCm: order.heightCm,
  }),
});
if (response.status === 201) {
  const parcel = await response.json();
  saveTrackingNumber(order.number, parcel.trackingNumber); // e.g. SD2611004817
}`,
    },
  ];
}

const ORDER_ANSWERS: { status: string; meaning: string }[] = [
  { status: "201", meaning: "The order was created. You get its tracking number and delivery fee." },
  { status: "400", meaning: "Some order details are missing or wrong. The answer says which ones." },
  { status: "401", meaning: "The API key is missing, wrong, or was turned off." },
  { status: "403", meaning: "Your business account isn't approved." },
  { status: "409", meaning: "The parcel is too big or heavy for our vehicles. Contact us for a price." },
];

const EXAMPLE_PAYLOAD = `{
  "id": "6f1c2a8e-4b0d-4c1e-9f3a-2d7b8e5c1a90",
  "type": "parcel.delivered",
  "createdAt": "2026-11-13T09:15:00Z",
  "data": {
    "parcelId": "22222222-2222-2222-2222-222222222222",
    "trackingNumber": "SD2611004817",
    "merchantOrderRef": "TECH-ORD-1001",
    "status": "DELIVERED",
    "previousStatus": "OUT_FOR_DELIVERY",
    "sequence": 7,
    "branch": null,
    "failureReason": null
  }
}`;

const ROUTING_EXAMPLE = `app.post("/webhooks/swiftdrop", express.raw({ type: "application/json" }), (req, res) => {
  if (!isFromSwiftDrop(req.body, req.headers, process.env.SWIFTDROP_WEBHOOK_SECRET)) {
    return res.sendStatus(401);
  }
  const event = JSON.parse(req.body);
  if (alreadyProcessed(event.id)) return res.sendStatus(200); // the same event can arrive twice

  switch (event.type) {
    case "parcel.picked_up":
    case "parcel.out_for_delivery":
      markShipping(event.data.merchantOrderRef, event.data);
      break;
    case "parcel.delivered":
      markDelivered(event.data.merchantOrderRef);
      break;
    case "parcel.failed":
      flagDeliveryProblem(event.data.merchantOrderRef, event.data.failureReason);
      break;
    case "webhook.ping":
    default:
      break; // nothing to do
  }
  res.sendStatus(200); // answer quickly; do slow work afterwards
});`;

const HEADERS: { name: string; value: string }[] = [
  { name: "X-SwiftDrop-Event-Id", value: "The update's ID (the same if it's sent again)." },
  { name: "X-SwiftDrop-Event-Type", value: "What happened, for example parcel.delivered." },
  { name: "X-SwiftDrop-Timestamp", value: "When this update was sent." },
  { name: "X-SwiftDrop-Signature", value: "The signature your system checks with the secret." },
];

const SAMPLES: { value: string; label: string; code: string }[] = [
  {
    value: "node",
    label: "Node.js",
    code: `import crypto from "node:crypto";

// rawBody: the request body exactly as received (e.g. express.raw({ type: "application/json" }))
export function isFromSwiftDrop(rawBody, headers, secret) {
  const timestamp = headers["x-swiftdrop-timestamp"] ?? "";
  const signature = headers["x-swiftdrop-signature"] ?? "";
  if (!/^\\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return false; // missing, or more than 5 minutes old
  }
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`,
  },
  {
    value: "python",
    label: "Python",
    code: `import hashlib
import hmac
import time

def is_from_swiftdrop(raw_body: bytes, headers, secret: str) -> bool:
    timestamp = headers.get("X-SwiftDrop-Timestamp", "")
    signature = headers.get("X-SwiftDrop-Signature", "")
    if not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:
        return False  # missing, or more than 5 minutes old
    message = timestamp.encode() + b"." + raw_body
    expected = "sha256=" + hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)`,
  },
  {
    value: "php",
    label: "PHP",
    code: `<?php
// $rawBody = file_get_contents('php://input');
function isFromSwiftDrop(string $rawBody, string $secret): bool
{
    $timestamp = $_SERVER['HTTP_X_SWIFTDROP_TIMESTAMP'] ?? '';
    $signature = $_SERVER['HTTP_X_SWIFTDROP_SIGNATURE'] ?? '';
    if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
        return false; // missing, or more than 5 minutes old
    }
    $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    return hash_equals($expected, $signature);
}`,
  },
];

const RULES: { title: string; text: string }[] = [
  {
    title: "Reply quickly",
    text: "Your system should say \"received\" within 10 seconds, and do any slow work after that.",
  },
  {
    title: "Missed updates are sent again",
    text: "If your system doesn't reply, we try again after 1 min, 5 min, 15 min, 1 hour and 6 hours. After that the update shows as Failed, and you can send it again from the webhook's page.",
  },
  {
    title: "The same update can arrive twice",
    text: "Each update has its own ID. If you get one you've already handled, just ignore it.",
  },
  {
    title: "Updates can arrive late",
    text: "Each update has a number that goes up for every change to the order. Ignore one with a lower number than the last you got for that order.",
  },
  {
    title: "Test pings",
    text: "A test ping is sent once and only checks that your address works. You can send a new one every 10 seconds.",
  },
  {
    title: "No personal details",
    text: "Updates never include your customers' names, phone numbers or addresses. Use your order number to find the order.",
  },
];

/**
 * The setup guide on a webhook's page, in plain words for the merchant, in the order they set things up: send orders
 * with the API key, choose the updates, then receive and check them. Code is only shown as examples "for your
 * developer".
 */
export function SetupGuide() {
  const url = ordersUrl();
  const samples = orderSamples(url);

  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="guide-orders-heading">
        <CardHeader
          title="1. Connect your shop with an API key"
          titleId="guide-orders-heading"
          description="Your shop sends its orders to SwiftDrop by itself. Then we send your shop an update each time an order moves."
        />
        <CardContent className="flex flex-col gap-4">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-sm text-grey-900">
            <li>
              Create a key on the{" "}
              <Link href="/merchant/api-keys" className="text-orange-700 hover:text-orange-800 hover:underline">
                API keys
              </Link>{" "}
              page. Keep it secret, like a password: only your shop&apos;s system should have it.
            </li>
            <li>
              Your shop sends each new order to <span className="font-mono break-all">{url}</span>, with the key
              attached. Nobody needs to be signed in to SwiftDrop for this to work.
            </li>
            <li>
              Add your own order number to each order. We include it in every update, so you know which order it&apos;s
              about. Sending the same order number twice won&apos;t create a second order.
            </li>
          </ol>
          <Tabs defaultValue={samples[0].value}>
            <TabsList aria-label="Order examples">
              {samples.map((sample) => (
                <TabsTrigger key={sample.value} value={sample.value}>
                  {sample.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {samples.map((sample) => (
              <TabsContent key={sample.value} value={sample.value}>
                <CodeBlock code={sample.code} label="Example for your developer" />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Answer code</TableHead>
              <TableHead>What it means</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ORDER_ANSWERS.map((answer) => (
              <TableRow key={answer.status}>
                <TableCell className="font-mono text-body-sm whitespace-nowrap">{answer.status}</TableCell>
                <TableCell className="text-body-sm text-grey-700">{answer.meaning}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card aria-labelledby="guide-events-heading">
        <CardHeader
          title="2. Updates you can get"
          titleId="guide-events-heading"
          description="Pick the ones you want when you add or edit the webhook. You only get updates about your own orders."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Update</TableHead>
              <TableHead>Sent when</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WEBHOOK_EVENT_TYPES.map((type) => (
              <TableRow key={type}>
                <TableCell className="whitespace-nowrap">
                  <span className="block text-label text-grey-900">{WEBHOOK_EVENT_LABEL[type]}</span>
                  <span className="block font-mono text-caption text-grey-600">{type}</span>
                </TableCell>
                <TableCell className="text-body-sm text-grey-700">{WEBHOOK_EVENT_DESCRIPTION[type]}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="whitespace-nowrap">
                <span className="block text-label text-grey-900">Test ping</span>
                <span className="block font-mono text-caption text-grey-600">webhook.ping</span>
              </TableCell>
              <TableCell className="text-body-sm text-grey-700">
                Only when you press Send test, to check that your address works.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <Card aria-labelledby="guide-payload-heading">
        <CardHeader
          title="3. What an update looks like"
          titleId="guide-payload-heading"
          description="Each update says what happened and gives your order number and tracking number. It never includes your customers' personal details."
        />
        <CardContent className="flex flex-col gap-4">
          <CodeBlock code={EXAMPLE_PAYLOAD} label="Example update" />
        </CardContent>
      </Card>

      <Card aria-labelledby="guide-route-heading">
        <CardHeader
          title="4. Handle all updates in one place"
          titleId="guide-route-heading"
          description="One webhook address can get every update you picked. Your system looks at what happened and updates the right order."
        />
        <CardContent className="flex flex-col gap-4">
          <CodeBlock code={ROUTING_EXAMPLE} label="Example for your developer" />
          <p className="text-body-sm text-grey-600">
            For a test ping, or an update you don&apos;t use, your system can simply reply &quot;received&quot; and do
            nothing else.
          </p>
        </CardContent>
      </Card>

      <Card aria-labelledby="guide-verify-heading">
        <CardHeader
          title="5. Make sure an update really comes from SwiftDrop"
          titleId="guide-verify-heading"
          description="Every update is signed with your webhook's secret. Your system checks the signature before trusting an update, and ignores updates older than 5 minutes."
        />
        <CardContent className="flex flex-col gap-6">
          <Tabs defaultValue={SAMPLES[0].value}>
            <TabsList aria-label="Code examples">
              {SAMPLES.map((sample) => (
                <TabsTrigger key={sample.value} value={sample.value}>
                  {sample.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SAMPLES.map((sample) => (
              <TabsContent key={sample.value} value={sample.value}>
                <CodeBlock code={sample.code} label="Example for your developer" />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent with every update</TableHead>
              <TableHead>What it is</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HEADERS.map((header) => (
              <TableRow key={header.name}>
                <TableCell className="font-mono text-body-sm whitespace-nowrap">{header.name}</TableCell>
                <TableCell className="text-body-sm text-grey-700">{header.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card aria-labelledby="guide-rules-heading">
        <CardHeader title="6. Good to know" titleId="guide-rules-heading" />
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2">
            {RULES.map((rule) => (
              <li key={rule.title} className="flex flex-col gap-1">
                <span className="text-label text-grey-900">{rule.title}</span>
                <span className="text-body-sm text-grey-600">{rule.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/** Read-only code with a copy button. Scrolls sideways on phones instead of breaking the layout. */
function CodeBlock({ code, label }: { code: string; label: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast({ tone: "success", title: "Copied" });
    } catch {
      toast({ tone: "error", title: "We couldn't copy it", description: "Select the text and copy it yourself." });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-grey-900">{label}</span>
        <Button type="button" variant="tertiary" onClick={copy}>
          <Copy aria-hidden="true" />
          Copy
        </Button>
      </div>
      <pre className="max-w-full overflow-x-auto rounded-md border border-grey-200 bg-grey-50 p-4 font-mono text-caption leading-relaxed text-grey-900">
        <code>{code}</code>
      </pre>
    </div>
  );
}
