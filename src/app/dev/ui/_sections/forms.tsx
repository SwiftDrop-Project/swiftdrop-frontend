"use client";

import { CreditCard, MapPin, Package, Store, User } from "lucide-react";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeInput } from "@/components/ui/code-input";
import { FieldError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioCards, type RadioCardOption } from "@/components/ui/radio-cards";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextLink } from "@/components/ui/text-link";
import { Example, ExampleGrid, Section } from "./gallery-parts";

const noop = () => {};

type PayWith = "ONLINE" | "AT_PICKUP" | "AT_DROP_OFF";

const PAY_WITH: readonly RadioCardOption<PayWith>[] = [
  { value: "ONLINE", label: "Online payment", description: "Pay now by card or online banking.", icon: CreditCard },
  {
    value: "AT_PICKUP",
    label: "Pay at pickup",
    description: "Pay the courier in cash when they collect the parcel.",
    icon: Package,
  },
  {
    value: "AT_DROP_OFF",
    label: "Pay at drop-off",
    description: "The recipient pays the courier in cash when the parcel arrives.",
    icon: MapPin,
  },
];

function DistrictOptions() {
  return (
    <>
      <option value="" disabled>
        Select a district
      </option>
      <option value="COLOMBO">Colombo</option>
      <option value="GAMPAHA">Gampaha</option>
      <option value="KANDY">Kandy</option>
    </>
  );
}

export function Forms() {
  const [code, setCode] = React.useState("48");
  const [completed, setCompleted] = React.useState<string | null>(null);
  const [accountType, setAccountType] = React.useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");
  const [keepLoggedIn, setKeepLoggedIn] = React.useState(true);
  const [payWith, setPayWith] = React.useState<PayWith | null>(null);

  return (
    <>
      <Section
        id="form-field"
        title="FormField"
        description={
          <>
            Label above, helper or error below (4px apart); fields 24px apart. The render prop hands the
            control its <code>id</code>, <code>aria-invalid</code> and <code>aria-describedby</code>.
            Errors say how to fix the problem.
          </>
        }
      >
        <ExampleGrid>
          <Example label="With helper" stack>
            <FormField id="g-name" label="Recipient name" helper="As written on their ID.">
              {(a11y) => <Input {...a11y} placeholder="Full name" />}
            </FormField>
          </Example>
          <Example label="With error" stack>
            <FormField id="g-email" label="Email" error="Enter a full email address, like name@example.com">
              {(a11y) => <Input {...a11y} defaultValue="nimal@" />}
            </FormField>
          </Example>
          <Example label="Optional hint and label link" stack>
            <FormField
              id="g-reg"
              label="Business reg. no."
              labelHint="(optional)"
              labelAside={
                <TextLink href="/dev/ui#form-field" className="text-label">
                  Where do I find it?
                </TextLink>
              }
            >
              {(a11y) => <Input {...a11y} placeholder="PV 00000000" />}
            </FormField>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="input"
        title="Input"
        description={
          <>
            48px by default (auth and page-level forms); <code>size=&quot;md&quot;</code> is 40px for
            compact places like toolbars and side cards. Focus: orange-600 border with a 3px orange-100 ring.
          </>
        }
      >
        <ExampleGrid>
          <Example label="Empty (48px)" stack>
            <Input aria-label="Example" placeholder="Full name" />
          </Example>
          <Example label="Filled" stack>
            <Input aria-label="Example" defaultValue="Ayesha Fernando" />
          </Example>
          <Example label="Error" stack>
            <Input aria-label="Example" aria-invalid defaultValue="nimal@" />
          </Example>
          <Example label="Disabled" stack>
            <Input aria-label="Example" disabled placeholder="Assigned after pickup" />
          </Example>
          <Example label="Size md (40px)" stack>
            <Input aria-label="Example" size="md" placeholder="SD 2611 0048 17" className="tabular-nums" />
          </Example>
        </ExampleGrid>
      </Section>

      <Section id="password-input" title="PasswordInput" description="Password with a show / hide button.">
        <ExampleGrid>
          <Example label="Default" stack>
            <PasswordInput aria-label="Password" defaultValue="parcel2026" />
          </Example>
          <Example label="Error" stack>
            <FormField id="g-password" label="Password" error="Use at least 8 characters, including a number.">
              {(a11y) => <PasswordInput {...a11y} defaultValue="short" />}
            </FormField>
          </Example>
          <Example label="Disabled" stack>
            <PasswordInput aria-label="Password" disabled />
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="phone-input"
        title="PhoneInput"
        description="Sri Lankan mobile number with a +94 prefix. Show saved numbers with formatPhone() from lib/format."
      >
        <ExampleGrid>
          <Example label="Empty" stack>
            <PhoneInput aria-label="Mobile number" placeholder="77 123 4567" />
          </Example>
          <Example label="Error" stack>
            <FormField id="g-phone" label="Mobile number" error="Enter a Sri Lankan mobile number, like 077 123 4567.">
              {(a11y) => <PhoneInput {...a11y} defaultValue="12345" />}
            </FormField>
          </Example>
          <Example label="Disabled, size md" stack>
            <PhoneInput aria-label="Mobile number" size="md" disabled defaultValue="77 123 4567" />
          </Example>
        </ExampleGrid>
      </Section>

      <Section id="select" title="Select" description="Native select with a grey chevron. Start with a disabled placeholder option.">
        <ExampleGrid>
          <Example label="Nothing selected" stack>
            <Select aria-label="District" defaultValue="">
              <DistrictOptions />
            </Select>
          </Example>
          <Example label="Selected" stack>
            <Select aria-label="District" defaultValue="KANDY">
              <DistrictOptions />
            </Select>
          </Example>
          <Example label="Error" stack>
            <Select aria-label="District" aria-invalid defaultValue="">
              <DistrictOptions />
            </Select>
          </Example>
          <Example label="Disabled (loading)" stack>
            <Select aria-label="District" disabled defaultValue="">
              <option value="" disabled>
                Loading districts…
              </option>
            </Select>
          </Example>
          <Example label="Size md" stack>
            <Select aria-label="District" size="md" defaultValue="COLOMBO">
              <DistrictOptions />
            </Select>
          </Example>
        </ExampleGrid>
      </Section>

      <Section id="textarea" title="Textarea" description="Longer text, e.g. delivery instructions. Resizes vertically.">
        <ExampleGrid>
          <Example label="Empty" stack>
            <Textarea aria-label="Instructions" placeholder="Leave it with the security guard" />
          </Example>
          <Example label="Error" stack>
            <FormField id="g-notes" label="Instructions" error="Use at most 500 characters.">
              {(a11y) => <Textarea {...a11y} defaultValue="Call before coming." />}
            </FormField>
          </Example>
          <Example label="Disabled" stack>
            <Textarea aria-label="Instructions" disabled defaultValue="Fragile" />
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="code-input"
        title="CodeInput"
        description="Six boxes for a one-time code. Type, paste a whole code into any box, or use Backspace and the arrow keys."
      >
        <ExampleGrid>
          <Example label="Interactive" stack>
            <FormField
              id="g-code"
              label="Verification code"
              helper={completed ? `Code complete: ${completed}` : "We sent it to +94 77 123 4567."}
            >
              {(a11y) => (
                <CodeInput
                  id={a11y.id}
                  aria-invalid={a11y["aria-invalid"]}
                  aria-describedby={a11y["aria-describedby"]}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setCompleted(null);
                  }}
                  onComplete={setCompleted}
                />
              )}
            </FormField>
          </Example>
          <Example label="Error" stack>
            <FormField id="g-code-error" label="Verification code" error="That code is wrong or has expired. Request a new one.">
              {(a11y) => (
                <CodeInput
                  id={a11y.id}
                  aria-invalid={a11y["aria-invalid"]}
                  aria-describedby={a11y["aria-describedby"]}
                  value="123456"
                  onChange={noop}
                />
              )}
            </FormField>
          </Example>
          <Example label="Disabled" stack>
            <CodeInput value="" onChange={noop} disabled />
          </Example>
        </ExampleGrid>
      </Section>

      <Section id="checkbox" title="Checkbox" description="Checked is orange-600. Always pair it with a label.">
        <ExampleGrid>
          <Example label="States" stack>
            <div className="flex items-center gap-3">
              <Checkbox id="g-c1" checked={keepLoggedIn} onCheckedChange={(value) => setKeepLoggedIn(value === true)} />
              <label htmlFor="g-c1" className="cursor-pointer text-body text-grey-700">
                Keep me logged in on this device
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="g-c2" />
              <label htmlFor="g-c2" className="cursor-pointer text-body text-grey-700">
                Collect cash on delivery
              </label>
            </div>
          </Example>
          <Example label="Error" stack>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Checkbox id="g-c3" aria-invalid aria-describedby="g-c3-error" />
                <label htmlFor="g-c3" className="cursor-pointer text-body text-grey-700">
                  I agree to the Terms of Service
                </label>
              </div>
              <FieldError id="g-c3-error">Accept the terms to continue.</FieldError>
            </div>
          </Example>
          <Example label="Disabled" stack>
            <div className="flex items-center gap-3">
              <Checkbox id="g-c4" disabled defaultChecked />
              <label htmlFor="g-c4" className="text-body text-grey-400">
                Fragile (set by the merchant)
              </label>
            </div>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="segmented-control"
        title="SegmentedControl"
        description="Picks one of two or three modes that change the form below it. Selected: white with an orange-600 border."
      >
        <div className="max-w-form">
          <SegmentedControl
            name="g-account"
            legend="Account type"
            value={accountType}
            onChange={setAccountType}
            options={[
              { value: "CUSTOMER", label: "Customer", icon: User },
              { value: "MERCHANT", label: "Merchant", icon: Store },
            ]}
          />
        </div>
      </Section>

      <Section
        id="radio-cards"
        title="RadioCards"
        description="A choice between a few options, each with a line of explanation (e.g. how a delivery is paid). Nothing is chosen at first. Chosen: orange-600 border and dot. One row from sm up, stacked on phones."
      >
        <div className="flex flex-col gap-10">
          <Example label="Interactive" stack>
            <RadioCards
              name="g-pay"
              legend="How will the delivery fee be paid?"
              value={payWith}
              options={PAY_WITH}
              onChange={setPayWith}
            />
          </Example>
          <Example label="Error (nothing chosen)" stack>
            <RadioCards
              name="g-pay-error"
              legend="How will the delivery fee be paid?"
              value={null}
              options={PAY_WITH}
              onChange={noop}
              error="Choose how the delivery fee will be paid."
            />
          </Example>
          <Example label="Disabled" stack>
            <RadioCards
              name="g-pay-disabled"
              legend="How will the delivery fee be paid?"
              value="AT_PICKUP"
              options={PAY_WITH}
              onChange={noop}
              disabled
            />
          </Example>
        </div>
      </Section>
    </>
  );
}
