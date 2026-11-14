import * as React from "react";

const STEPS = [
  {
    step: "1",
    title: "Book a delivery",
    description: "Schedule a doorstep pickup online or hand over your parcel at any SwiftDrop branch.",
  },
  {
    step: "2",
    title: "Moves through our branches",
    description: "Your parcel is sorted, securely dispatched, and transported through our connected district network.",
  },
  {
    step: "3",
    title: "Delivered live",
    description: "Delivered directly to the recipient, with live status updates you can follow as it moves.",
  },
];

export function LandingHowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <div className="flex flex-col gap-1">
        <h2 id="how-it-works-heading" className="text-h2 text-grey-900">
          How it works
        </h2>
        <p className="text-body text-grey-600">
          Simple three-step parcel delivery from booking to recipient confirmation.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-6"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-grey-100 text-label font-semibold text-grey-900">
              {item.step}
            </span>
            <h3 className="text-h3 text-grey-900">{item.title}</h3>
            <p className="text-body-sm text-grey-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

