"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { DetailPage } from "@/components/layout/detail-page";
import { FormActions, FormPage, FormSection } from "@/components/layout/form-page";
import { ListPage } from "@/components/layout/list-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timeline } from "@/components/ui/timeline";
import { formatRs } from "@/lib/format";
import { Example, Frame, Section } from "./gallery-parts";

const createButton = (
  <Button asChild>
    <Link href="/dev/ui#templates">
      <Plus aria-hidden="true" />
      Create delivery
    </Link>
  </Button>
);

export function Templates() {
  return (
    <>
      <Section
        id="page-header"
        title="PageHeader"
        description="Heading 1 with a one-line description. Optional: one primary action, a status badge, a back link."
      >
        <Example label="Plain" stack>
          <Frame>
            <PageHeader title="Merchants" description="Approve new merchant accounts so they can log in and send orders." className="mb-0" />
          </Frame>
        </Example>
        <Example label="With a primary action" stack>
          <Frame>
            <PageHeader title="My deliveries" description="Every parcel you send, newest first." action={createButton} className="mb-0" />
          </Frame>
        </Example>
        <Example label="With back link and status" stack>
          <Frame>
            <PageHeader
              title="SD 2611 0048 17"
              description="To Nimal Perera, Kandy"
              status={<StatusBadge status="IN_TRANSIT" />}
              backHref="/dev/ui#page-header"
              backLabel="Back to deliveries"
              className="mb-0"
            />
          </Frame>
        </Example>
      </Section>

      <Section
        id="templates"
        title="Page templates"
        description={
          <>
            Start every page in the app from one of these (<code>@/components/layout</code>). They set the
            header, spacing and columns so every page lines up.
          </>
        }
      >
        <Example label="ListPage: lists with search, filters and paging" stack>
          <Frame>
            <ListPage
              title="My deliveries"
              description="Every parcel you send, newest first."
              action={createButton}
              toolbar={
                <>
                  <div className="w-full sm:max-w-xs">
                    <Input size="md" aria-label="Search deliveries" type="search" placeholder="Tracking number or recipient" />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select size="md" aria-label="Status" defaultValue="ALL">
                      <option value="ALL">All statuses</option>
                      <option value="IN_TRANSIT">In transit</option>
                      <option value="DELIVERED">Delivered</option>
                    </Select>
                  </div>
                </>
              }
            >
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-label tabular-nums">SD 2611 0048 17</TableCell>
                      <TableCell>
                        <StatusBadge status="IN_TRANSIT" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatRs(450)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-label tabular-nums">SD 2611 0048 18</TableCell>
                      <TableCell>
                        <StatusBadge status="DELIVERED" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatRs(2450)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Pagination page={0} totalPages={1} totalElements={2} size={20} getHref={() => "/dev/ui#templates"} />
              </Card>
            </ListPage>
          </Frame>
        </Example>

        <Example label="DetailPage: one item, main column plus side column" stack>
          <Frame>
            <DetailPage
              title="SD 2611 0048 17"
              description="To Nimal Perera, Kandy"
              backHref="/dev/ui#templates"
              backLabel="Back to deliveries"
              status={<StatusBadge status="OUT_FOR_DELIVERY" />}
              actions={<Button variant="secondary">Download receipt</Button>}
              aside={
                <Card aria-labelledby="g-history">
                  <CardHeader titleId="g-history" title="History" />
                  <CardContent>
                    <Timeline
                      items={[
                        { id: "2", title: "Out for delivery", timestamp: "2026-11-03T03:10:00Z" },
                        { id: "1", title: "Picked up", timestamp: "2026-11-02T05:15:00Z" },
                      ]}
                    />
                  </CardContent>
                </Card>
              }
            >
              <Card aria-labelledby="g-recipient">
                <CardHeader titleId="g-recipient" title="Recipient" />
                <CardContent>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
                    <dt className="text-grey-600">Name</dt>
                    <dd>Nimal Perera</dd>
                    <dt className="text-grey-600">Mobile</dt>
                    <dd className="tabular-nums">+94 77 123 4567</dd>
                    <dt className="text-grey-600">Address</dt>
                    <dd>45 Peradeniya Road, Kandy</dd>
                  </dl>
                </CardContent>
              </Card>
            </DetailPage>
          </Frame>
        </Example>

        <Example label="FormPage: create and edit, 640px column" stack>
          <Frame>
            <FormPage
              title="Create delivery"
              description="Enter the recipient and the parcel. We'll show the price before you book."
              backHref="/dev/ui#templates"
              backLabel="Back to deliveries"
            >
              <form className="flex flex-col gap-12" noValidate onSubmit={(event) => event.preventDefault()}>
                <FormSection title="Recipient" description="Who the rider hands the parcel to.">
                  <FormField id="g-form-name" label="Full name">
                    {(a11y) => <Input {...a11y} autoComplete="off" />}
                  </FormField>
                  <FormField id="g-form-phone" label="Mobile number">
                    {(a11y) => <PhoneInput {...a11y} placeholder="77 123 4567" />}
                  </FormField>
                </FormSection>
                <FormSection title="Parcel">
                  <FormField id="g-form-weight" label="Weight" helper="In kilograms, rounded up.">
                    {(a11y) => <Input {...a11y} inputMode="decimal" placeholder="1.5" />}
                  </FormField>
                </FormSection>
                <FormActions>
                  <Button type="submit">Create delivery</Button>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </FormActions>
              </form>
            </FormPage>
          </Frame>
        </Example>
      </Section>
    </>
  );
}
