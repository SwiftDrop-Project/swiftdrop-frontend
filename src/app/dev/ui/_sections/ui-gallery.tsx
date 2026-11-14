import { Logo } from "@/components/ui/logo";
import { Actions } from "./actions";
import { DataDisplay } from "./data-display";
import { Feedback } from "./feedback";
import { Forms } from "./forms";
import { Foundations } from "./foundations";
import { Templates } from "./templates";

const NAV: { group: string; items: [id: string, label: string][] }[] = [
  { group: "Foundations", items: [["colour", "Colour"], ["type", "Typography"]] },
  {
    group: "Actions",
    items: [["button", "Button"], ["icon-button", "IconButton"], ["text-link", "TextLink"]],
  },
  {
    group: "Forms",
    items: [
      ["form-field", "FormField"],
      ["input", "Input"],
      ["password-input", "PasswordInput"],
      ["phone-input", "PhoneInput"],
      ["select", "Select"],
      ["textarea", "Textarea"],
      ["code-input", "CodeInput"],
      ["checkbox", "Checkbox"],
      ["segmented-control", "SegmentedControl"],
      ["radio-cards", "RadioCards"],
    ],
  },
  {
    group: "Data",
    items: [
      ["status-badge", "StatusBadge, Badge"],
      ["card", "Card"],
      ["table", "Table"],
      ["pagination", "Pagination"],
      ["tabs", "Tabs"],
      ["stepper", "Stepper"],
      ["timeline", "Timeline"],
    ],
  },
  {
    group: "Feedback",
    items: [
      ["inline-notice", "InlineNotice"],
      ["toast", "Toast"],
      ["dialog", "Dialog"],
      ["empty-state", "EmptyState"],
      ["skeleton", "Skeleton"],
    ],
  },
  { group: "Layout", items: [["page-header", "PageHeader"], ["templates", "Page templates"]] },
];

/** The /dev/ui living style guide. */
export function UiGallery() {
  return (
    <div className="lg:flex">
      <nav
        aria-label="Components"
        className="hidden w-sidebar shrink-0 border-r border-grey-200 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto"
      >
        <div className="flex h-topbar items-center border-b border-grey-200 px-6">
          <Logo className="h-7" />
        </div>
        <div className="flex flex-col gap-6 px-3 py-4">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-3 pb-2 text-caption tracking-wider text-grey-500 uppercase">{group.group}</p>
              <ul className="flex flex-col">
                {group.items.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex h-8 items-center rounded-md px-3 text-body-sm text-grey-700 hover:bg-grey-50 hover:text-grey-900"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <main id="main" className="min-w-0 flex-1 px-4 py-10 lg:px-8">
        <div className="max-w-content">
          <header className="flex flex-col gap-2 border-b border-grey-200 pb-10">
            <p className="text-caption tracking-wider text-grey-500 uppercase">Development only</p>
            <h1 className="text-display text-grey-900">SwiftDrop UI kit</h1>
            <p className="max-w-2xl text-body text-grey-600">
              Every base component in <code>src/components/ui</code> and every page template in{" "}
              <code>src/components/layout</code>, in every state. Build pages only from these. If something is
              missing, add it to components/ui in its own pull request and show it here. Check your page at
              375px wide as well as on desktop.
            </p>
          </header>
          <Foundations />
          <Actions />
          <Forms />
          <DataDisplay />
          <Feedback />
          <Templates />
        </div>
      </main>
    </div>
  );
}
