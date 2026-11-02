import { cn } from "@/lib/utils";
import { Section } from "./gallery-parts";

/* Class names are written out in full so Tailwind generates them. */
const COLOURS: { group: string; note: string; tokens: { name: string; swatch: string; use: string }[] }[] = [
  {
    group: "Accent (orange)",
    note: "Actions and active states only. Never for status.",
    tokens: [
      { name: "orange-50", swatch: "bg-orange-50", use: "Active nav fill" },
      { name: "orange-100", swatch: "bg-orange-100", use: "Input focus ring" },
      { name: "orange-500", swatch: "bg-orange-500", use: "Logo and auth panel only" },
      { name: "orange-600", swatch: "bg-orange-600", use: "Focus border, checked, selected" },
      { name: "orange-700", swatch: "bg-orange-700", use: "Primary button, text links" },
      { name: "orange-800", swatch: "bg-orange-800", use: "Primary hover, active nav label" },
    ],
  },
  {
    group: "Neutrals",
    note: "Every surface is white; greys for borders, text and quiet fills.",
    tokens: [
      { name: "white", swatch: "bg-white", use: "All page surfaces" },
      { name: "grey-50", swatch: "bg-grey-50", use: "Hover, subtle fills, disabled input" },
      { name: "grey-100", swatch: "bg-grey-100", use: "Row dividers, disabled button" },
      { name: "grey-200", swatch: "bg-grey-200", use: "Default borders" },
      { name: "grey-300", swatch: "bg-grey-300", use: "Control borders" },
      { name: "grey-400", swatch: "bg-grey-400", use: "Disabled text" },
      { name: "grey-500", swatch: "bg-grey-500", use: "Placeholder, nav group labels" },
      { name: "grey-600", swatch: "bg-grey-600", use: "Secondary text" },
      { name: "grey-700", swatch: "bg-grey-700", use: "Icons, quiet labels" },
      { name: "grey-800", swatch: "bg-grey-800", use: "Strong text on fills" },
      { name: "grey-900", swatch: "bg-grey-900", use: "Primary text" },
    ],
  },
  {
    group: "Functional",
    note: "Validation and delivery outcomes only. Never decorative.",
    tokens: [
      { name: "error", swatch: "bg-error", use: "Field errors, error border" },
      { name: "error-tint", swatch: "bg-error-tint", use: "Error notice fill" },
      { name: "success", swatch: "bg-success", use: "Delivered" },
      { name: "success-tint", swatch: "bg-success-tint", use: "Delivered badge fill" },
    ],
  },
];

const TYPE = [
  { name: "text-display", spec: "32 / 40 / 600", sample: "Track a parcel" },
  { name: "text-h1", spec: "24 / 32 / 600", sample: "Create delivery" },
  { name: "text-h2", spec: "20 / 28 / 600", sample: "Pickup details" },
  { name: "text-h3", spec: "16 / 24 / 600", sample: "Recipient" },
  { name: "text-body", spec: "16 / 24 / 400", sample: "Your parcel has been handed to a rider at the Kandy branch." },
  { name: "text-body-sm", spec: "14 / 20 / 400", sample: "Pickup address, recipient and parcel weight are required." },
  { name: "text-label", spec: "14 / 20 / 500", sample: "Mobile number" },
  { name: "text-caption", spec: "12 / 16 / 500", sample: "Updated 10:42 AM" },
  { name: "text-label tabular-nums", spec: "14 / 20 / 500, tabular", sample: "SD 2611 0048 17 · Rs. 2,450.00" },
];

export function Foundations() {
  return (
    <>
      <Section
        id="colour"
        title="Colour"
        description={
          <>
            Tokens from DESIGN.md, defined only in <code>src/app/globals.css</code>. Use the classes
            (<code>bg-grey-50</code>, <code>text-orange-700</code>); hex values and arbitrary colours fail lint.
          </>
        }
      >
        {COLOURS.map((group) => (
          <div key={group.group} className="flex flex-col gap-3">
            <div>
              <h3 className="text-h3 text-grey-900">{group.group}</h3>
              <p className="text-body-sm text-grey-600">{group.note}</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {group.tokens.map((token) => (
                <li key={token.name} className="overflow-hidden rounded-lg border border-grey-200">
                  <div className={cn("h-14 border-b border-grey-200", token.swatch)} />
                  <div className="flex flex-col gap-0.5 p-3">
                    <span className="text-label text-grey-900">{token.name}</span>
                    <span className="text-caption font-normal text-grey-600">{token.use}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section
        id="type"
        title="Typography"
        description="IBM Plex Sans 400 / 500 / 600. These are the only sizes; arbitrary sizes fail lint."
      >
        <dl className="flex flex-col divide-y divide-grey-100 rounded-lg border border-grey-200">
          {TYPE.map((style) => (
            <div key={style.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="flex shrink-0 flex-col sm:w-56">
                <code className="text-label text-grey-900">{style.name}</code>
                <span className="text-caption font-normal text-grey-600">{style.spec}</span>
              </dt>
              <dd className={cn("min-w-0 text-grey-900", style.name)}>{style.sample}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
