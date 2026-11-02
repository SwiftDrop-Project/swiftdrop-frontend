"use client";

import { Package } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Example, ExampleGrid, Section } from "./gallery-parts";

export function Feedback() {
  return (
    <>
      <Section
        id="inline-notice"
        title="InlineNotice"
        description="A message that stays on the page: above a form after a failed submit, or after an action. Errors are announced to screen readers."
      >
        <ExampleGrid>
          <Example label="Info" stack>
            <InlineNotice title="Pickup requested">
              The Colombo 03 branch will assign a rider. You&apos;ll get an SMS when they&apos;re on the way.
            </InlineNotice>
          </Example>
          <Example label="Success" stack>
            <InlineNotice tone="success" title="Address saved">
              Riders will collect from 12 Galle Road, Colombo 03.
            </InlineNotice>
          </Example>
          <Example label="Error" stack>
            <InlineNotice tone="error" title="We couldn't log you in">
              The mobile number or password is incorrect. Check both and try again.
            </InlineNotice>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="toast"
        title="Toast"
        description={
          <>
            A short confirmation that disappears on its own. Call <code>toast(&#123; tone, title, description &#125;)</code>{" "}
            from client code. For anything the user must act on, use InlineNotice instead.
          </>
        }
      >
        <Example label="Show one">
          <Button variant="secondary" onClick={() => toast({ title: "Pickup requested", description: "We'll SMS you when the rider is on the way." })}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "success", title: "Delivery created", description: "Tracking number SD 2611 0048 17." })}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "error", title: "We couldn't save the address", description: "Check your connection and try again." })}>
            Error toast
          </Button>
        </Example>
      </Section>

      <Section
        id="dialog"
        title="Dialog and AlertDialog"
        description="Dialog for a short task on top of the page. AlertDialog to confirm something that can't be undone, with a danger button."
      >
        <Example label="Open one">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Edit address</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit pickup address</DialogTitle>
                <DialogDescription>Riders collect from this address unless you choose another.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <FormField id="g-dialog-line1" label="Address">
                  {(a11y) => <Input {...a11y} defaultValue="12 Galle Road" />}
                </FormField>
                <FormField id="g-dialog-city" label="City or town">
                  {(a11y) => <Input {...a11y} defaultValue="Colombo 03" />}
                </FormField>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Save address</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="tertiary">Delete address</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this address?</AlertDialogTitle>
                <AlertDialogDescription>
                  12 Galle Road, Colombo 03 will be removed. Deliveries already booked keep it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="danger">Delete address</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Example>
      </Section>

      <Section
        id="empty-state"
        title="EmptyState"
        description="Icon in a grey box, a title, one line saying what will appear here, and one primary button."
      >
        <ExampleGrid columns={2}>
          <Example label="Default (inside a card or table)" stack>
            <Card className="p-6 sm:p-8">
              <EmptyState
                icon={Package}
                title="No deliveries yet"
                description="Deliveries you create will be listed here with their latest status."
                actions={<Button>Create delivery</Button>}
              />
            </Card>
          </Example>
          <Example label="Large (main card of a page)" stack>
            <Card className="p-6 sm:p-10">
              <EmptyState
                icon={Package}
                size="lg"
                title="You haven’t sent any parcels yet"
                description="Create a delivery and a rider will collect it from your address."
                actions={
                  <>
                    <Button>Create delivery</Button>
                    <Button variant="secondary">Add a pickup address</Button>
                  </>
                }
              />
            </Card>
          </Example>
        </ExampleGrid>
      </Section>

      <Section id="skeleton" title="Skeleton" description="Grey placeholder while content loads. Match the size of what will appear.">
        <Example label="Text and a button" stack>
          <div className="flex max-w-md flex-col gap-3" aria-hidden="true">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-36" />
          </div>
        </Example>
      </Section>
    </>
  );
}
