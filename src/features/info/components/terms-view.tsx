import * as React from "react";
import { SUPPORT_EMAIL, UNIVERSITY_PROJECT_NOTICE } from "../constants";
import { InfoArticleLayout, InfoSection, type TocSection } from "./info-article-layout";

const TERMS_SECTIONS: TocSection[] = [
  { id: "about", label: "About these terms" },
  { id: "accounts", label: "Accounts" },
  { id: "business-accounts", label: "Business accounts" },
  { id: "booking-and-fees", label: "Booking and fees" },
  { id: "prohibited-items", label: "Items we don't carry" },
  { id: "packaging", label: "Packaging" },
  { id: "pickup-and-delivery", label: "Pickup and delivery" },
  { id: "cash-on-delivery", label: "Cash on delivery" },
  { id: "loss-or-damage", label: "Loss or damage" },
  { id: "suspending-accounts", label: "Suspending accounts" },
  { id: "changes", label: "Changes to these terms" },
  { id: "governing-law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export function TermsView() {
  return (
    <InfoArticleLayout
      title="Terms of Service"
      description="The rules for using SwiftDrop accounts, booking deliveries, and shipping parcels across Sri Lanka."
      notice={{ title: "Project notice", body: UNIVERSITY_PROJECT_NOTICE }}
      sections={TERMS_SECTIONS}
    >
      <InfoSection id="about" title="About these terms">
        <p>
          These Terms of Service govern your use of the SwiftDrop parcel delivery website and services. By creating an
          account or booking a delivery through SwiftDrop, you agree to follow these terms.
        </p>
      </InfoSection>

      <InfoSection id="accounts" title="Accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-grey-900">Accurate details:</span> provide true and up-to-date contact
            information, including your name, verified email address, and Sri Lankan mobile number.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Password safety:</span> keep your password confidential and do
            not share access to your account with others. Notify us right away if you suspect unauthorized access.
          </li>
          <li>
            <span className="font-semibold text-grey-900">One person per account:</span> personal accounts are for
            individual use only.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="business-accounts" title="Business accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-grey-900">Approval:</span> business (merchant) applications are reviewed
            and must be approved by SwiftDrop before business features become active.
          </li>
          <li>
            <span className="font-semibold text-grey-900">API keys:</span> keep your API keys secret and store them
            securely on your servers. If a key is exposed, revoke it immediately from your merchant dashboard.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Webhooks:</span> ensure your webhook endpoints use HTTPS and
            handle incoming status notifications responsibly.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="booking-and-fees" title="Booking and fees">
        <p>
          You see the calculated delivery fee before confirming any booking. The fee depends on the pickup and delivery
          districts, parcel weight, vehicle type, and any cash-on-delivery service selected.
        </p>
        <p>
          If the actual weight or dimensions of the parcel differ from what was declared when booking, the delivery price
          may change or the parcel may require a manual quote before dispatch.
        </p>
      </InfoSection>

      <InfoSection id="prohibited-items" title="Items we don't carry">
        <p>
          Standard parcels may weigh up to <span className="font-semibold text-grey-900">50 kg</span> (larger or heavier
          shipments require a manual quote). We do not accept or transport:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Illegal goods or items prohibited under Sri Lankan law</li>
          <li>Weapons, firearms, ammunition, or weapon components</li>
          <li>Explosives, fireworks, compressed gases, or flammable items</li>
          <li>Illegal drugs or controlled narcotics</li>
          <li>Live animals or biological specimens</li>
          <li>Perishable food requiring temperature control</li>
          <li>Cash, currency notes, jewellery, bullion, or high-value negotiables</li>
        </ul>
      </InfoSection>

      <InfoSection id="packaging" title="Packaging">
        <p>
          Senders are responsible for packing items securely in sturdy, sealed outer packaging suitable for handling and
          transport between district branches. Fragile contents must be cushioned to prevent movement inside the box.
          Attach or clearly display the parcel tracking label on the outside.
        </p>
      </InfoSection>

      <InfoSection id="pickup-and-delivery" title="Pickup and delivery">
        <p>
          Couriers collect parcels from your pickup address and deliver them to the recipient&apos;s address through our
          branch network across all 25 districts. Ensure someone is available at the pickup and delivery addresses with
          valid contact numbers.
        </p>
        <p>
          If a delivery attempt fails because the recipient is unreachable or unavailable, the parcel returns to the
          destination district branch so another delivery attempt can be arranged.
        </p>
      </InfoSection>

      <InfoSection id="cash-on-delivery" title="Cash on delivery">
        <p>
          When cash on delivery is selected, the courier collects the specified amount (up to{" "}
          <span className="font-semibold text-grey-900 tabular-nums">LKR 500,000</span> per parcel) from the recipient
          before handing over the parcel.
        </p>
      </InfoSection>

      <InfoSection id="loss-or-damage" title="Loss or damage">
        <p>
          If a parcel is lost or arrives damaged, you must report the issue to{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          within <span className="font-semibold text-grey-900">7 days</span> of the delivery date or expected delivery
          window, providing your tracking number and details of the issue.
        </p>
        <p>Our liability for loss or damage is limited to the delivery fee paid, unless agreed otherwise in writing.</p>
      </InfoSection>

      <InfoSection id="suspending-accounts" title="Suspending accounts">
        <p>
          SwiftDrop may suspend, disable, or permanently remove an account if a user breaches these terms, ships
          prohibited items, abuses API keys or rate limits, or uses the platform fraudulently.
        </p>
      </InfoSection>

      <InfoSection id="changes" title="Changes to these terms">
        <p>
          We may update these terms from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at
          the top of this page. Continued use of SwiftDrop after updates means you accept the revised terms.
        </p>
      </InfoSection>

      <InfoSection id="governing-law" title="Governing law">
        <p>These terms are governed by and construed in accordance with the laws of Sri Lanka.</p>
      </InfoSection>

      <InfoSection id="contact" title="Contact">
        <p>
          For questions about these Terms of Service, contact us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </InfoSection>
    </InfoArticleLayout>
  );
}

