"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

/* Static content from API.md "Webhooks (WP6)": what arrives, the headers and how to check the signature. */

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

const HEADERS: { name: string; value: string }[] = [
  { name: "X-SwiftDrop-Event-Id", value: "Same as id in the body. The same on every attempt and retry." },
  { name: "X-SwiftDrop-Event-Type", value: "Same as type, e.g. parcel.delivered or webhook.ping." },
  { name: "X-SwiftDrop-Timestamp", value: "Unix time in seconds when this attempt was sent (new on every attempt)." },
  { name: "X-SwiftDrop-Signature", value: "sha256= followed by the lowercase hex HMAC-SHA256 of <timestamp>.<raw body>." },
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
  { title: "Answer quickly", text: "Reply with any 2xx within 10 seconds, then do slow work. Redirects aren't followed." },
  {
    title: "Expect repeats",
    text: "Delivery is at least once: ignore an id you have already processed.",
  },
  {
    title: "Order by sequence",
    text: "Events can arrive late or out of order. Ignore one whose sequence is lower than the last you saw for that parcel.",
  },
  {
    title: "No personal data",
    text: "Bodies never contain customer names, phone numbers, addresses or courier notes. Use merchantOrderRef to find your order.",
  },
];

/** The integration guide on a webhook's page. */
export function SetupGuide() {
  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="guide-payload-heading">
        <CardHeader
          title="What your server receives"
          titleId="guide-payload-heading"
          description="A POST request with Content-Type: application/json. A test ping has data: { subscriptionId }."
        />
        <CardContent className="flex flex-col gap-4">
          <CodeBlock code={EXAMPLE_PAYLOAD} label="Example body" />
        </CardContent>
      </Card>

      <Card aria-labelledby="guide-headers-heading">
        <CardHeader title="Headers" titleId="guide-headers-heading" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
              <TableHead>Value</TableHead>
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

      <Card aria-labelledby="guide-verify-heading">
        <CardHeader
          title="Check the signature"
          titleId="guide-verify-heading"
          description="Do this before you trust a request."
        />
        <CardContent className="flex flex-col gap-6">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-sm text-grey-900">
            <li>Read the raw request body before any JSON parsing.</li>
            <li>
              Compute HMAC-SHA256 of <code className="font-mono">{"<timestamp>.<raw body>"}</code>, using the whole
              secret (including <code className="font-mono">whsec_</code>) as the key.
            </li>
            <li>
              Compare <code className="font-mono">sha256=&lt;hex&gt;</code> with X-SwiftDrop-Signature in constant time.
            </li>
            <li>Reject the request if the timestamp is more than 5 minutes old.</li>
          </ol>
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
                <CodeBlock code={sample.code} label={`${sample.label} example`} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card aria-labelledby="guide-rules-heading">
        <CardHeader title="Rules for your endpoint" titleId="guide-rules-heading" />
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
