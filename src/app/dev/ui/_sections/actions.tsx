"use client";

import Link from "next/link";
import { Bell, Download, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TextButton, TextLink } from "@/components/ui/text-link";
import { Example, ExampleGrid, Section } from "./gallery-parts";

export function Actions() {
  return (
    <>
      <Section
        id="button"
        title="Button"
        description={
          <>
            One primary button per view; labels are verbs. <code>lg</code> (48px) on auth screens and for
            page-level actions, default (40px) in the app. <code>danger</code> only to confirm a destructive
            action in a dialog. Use <code>asChild</code> with a <code>Link</code> for navigation.
          </>
        }
      >
        <ExampleGrid columns={2}>
          <Example label="Default size (40px)">
            <Button>
              <Plus aria-hidden="true" />
              Create delivery
            </Button>
            <Button variant="secondary">Track a parcel</Button>
            <Button variant="tertiary">Cancel</Button>
            <Button variant="danger">Delete address</Button>
          </Example>
          <Example label="Large (48px)">
            <Button size="lg">Log in</Button>
            <Button size="lg" variant="secondary">
              Book pickup
            </Button>
            <Button size="lg" variant="tertiary">
              Cancel
            </Button>
            <Button size="lg" variant="danger">
              Reject merchant
            </Button>
          </Example>
          <Example label="Disabled">
            <Button disabled>Create delivery</Button>
            <Button variant="secondary" disabled>
              Track a parcel
            </Button>
            <Button variant="tertiary" disabled>
              Cancel
            </Button>
            <Button variant="danger" disabled>
              Delete address
            </Button>
          </Example>
          <Example label="Loading (disables the button)">
            <Button loading>Creating delivery</Button>
            <Button variant="secondary" loading>
              Saving
            </Button>
            <Button size="lg" loading>
              Logging in
            </Button>
          </Example>
          <Example label="As a link">
            <Button asChild>
              <Link href="/dev/ui#button">Create delivery</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dev/ui#button">
                <Download aria-hidden="true" />
                Download receipt
              </Link>
            </Button>
          </Example>
          <Example label="Full width (auth forms)">
            <Button size="lg" className="w-full">
              Create account
            </Button>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="icon-button"
        title="IconButton"
        description={
          <>
            40px square, one 20px icon. <code>label</code> is required: it is what screen readers say.
            Secondary has a border; tertiary is for toolbars like the top bar.
          </>
        }
      >
        <ExampleGrid>
          <Example label="Secondary">
            <IconButton label="Filters">
              <SlidersHorizontal />
            </IconButton>
            <IconButton label="Delete">
              <Trash2 />
            </IconButton>
            <IconButton label="Filters" disabled>
              <SlidersHorizontal />
            </IconButton>
          </Example>
          <Example label="Tertiary">
            <IconButton variant="tertiary" label="Notifications">
              <Bell />
            </IconButton>
            <IconButton variant="tertiary" label="Notifications" disabled>
              <Bell />
            </IconButton>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="text-link"
        title="TextLink and TextButton"
        description="Orange-700 links inside text. TextButton looks the same but runs an action instead of navigating."
      >
        <Example label="In a sentence">
          <p className="text-body text-grey-600">
            New to SwiftDrop? <TextLink href="/dev/ui#text-link">Create an account</TextLink>
          </p>
          <p className="text-body-sm text-grey-600">
            Couldn&apos;t load districts. <TextButton>Try loading districts again</TextButton>
          </p>
        </Example>
      </Section>
    </>
  );
}
