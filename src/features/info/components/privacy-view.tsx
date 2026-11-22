import * as React from "react";
import { SUPPORT_EMAIL, UNIVERSITY_PROJECT_NOTICE } from "../constants";
import { InfoArticleLayout, InfoSection, type TocSection } from "./info-article-layout";

const PRIVACY_SECTIONS: TocSection[] = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "why-we-use-it", label: "Why we use it" },
  { id: "who-can-see-it", label: "Who can see it" },
  { id: "cookies", label: "Cookies" },
  { id: "retention", label: "How long we keep data" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
];

export function PrivacyView() {
  return (
    <InfoArticleLayout
      title="Privacy Policy"
      description="How SwiftDrop collects, uses, protects, and handles personal information."
      notice={{ title: "Project notice", body: UNIVERSITY_PROJECT_NOTICE }}
      sections={PRIVACY_SECTIONS}
    >
      <InfoSection id="who-we-are" title="Who we are">
        <p>
          SwiftDrop is a parcel delivery and courier management service operating across all 25 administrative districts
          of Sri Lanka. This policy explains what personal data we collect when you use our website or services, why we
          need it, and how you can manage your rights.
        </p>
      </InfoSection>

      <InfoSection id="what-we-collect" title="What we collect">
        <p>Depending on how you use SwiftDrop, we collect the following information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-grey-900">Account details:</span> your full name, email address, and Sri
            Lankan mobile number when you register. Businesses also provide business contact and registration details.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Delivery details:</span> sender and recipient names, mobile
            phone numbers, and pickup/delivery addresses required to collect and deliver parcels.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Parcel and payment details:</span> parcel weight, size or
            vehicle requirements, delivery fees, and cash-on-delivery collection amounts.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Google sign-in details:</span> if you choose to continue with
            Google, we receive your Google account name and email address to create or link your SwiftDrop account.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Technical data:</span> your IP address for rate limiting and
            security protection, plus an essential login session cookie when you sign in.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="why-we-use-it" title="Why we use it">
        <p>We use your information only to provide and secure the delivery service:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>To calculate delivery fees, schedule pickups, route parcels through branches, and complete deliveries.</li>
          <li>To send email verification codes, password reset codes, and parcel status updates by email.</li>
          <li>To collect and settle cash-on-delivery payments accurately.</li>
          <li>To protect accounts and endpoints against abuse through rate limiting and session verification.</li>
        </ul>
      </InfoSection>

      <InfoSection id="who-can-see-it" title="Who can see it">
        <p>Access to personal information is limited strictly by role and operational need:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-grey-900">Couriers and dispatchers:</span> couriers see only the pickup
            or delivery contact details needed for their assigned tasks; dispatchers see branch parcel queues to assign
            routes.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Businesses:</span> registered business accounts see only their
            own orders, API keys, and configured webhook delivery logs.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Public tracking:</span> anyone checking a tracking number sees
            only parcel status, districts, branch events, and timestamps—never names, phone numbers, or street
            addresses.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Service providers:</span> we rely on infrastructure providers
            for database hosting, transactional email sending, and Google sign-in authentication.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cookies" title="Cookies">
        <p>
          SwiftDrop uses only an essential httpOnly login cookie (<span className="font-semibold text-grey-900">SD_TOKEN</span>)
          to keep you signed in and verify your session with our backend.
        </p>
        <p>We do not use advertising cookies, third-party tracking scripts, or analytics cookies.</p>
      </InfoSection>

      <InfoSection id="retention" title="How long we keep data">
        <p>
          We keep your account information as long as your account remains active. Parcel records and delivery event
          histories are kept for operational record-keeping, dispute resolution, and cash-on-delivery reconciliation.
          When an account is permanently removed by an administrator, active sessions are revoked and account changes
          are disabled.
        </p>
      </InfoSection>

      <InfoSection id="security" title="Security">
        <p>We take practical technical steps to safeguard your data:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Encrypted HTTPS connections for data in transit between your browser and our servers.</li>
          <li>Passwords stored using one-way cryptographic hashing—never in plain text.</li>
          <li>Time-limited, single-use 6-digit email codes for verification and password resets.</li>
          <li>httpOnly cookies and server-side authorization checks on every protected request.</li>
        </ul>
      </InfoSection>

      <InfoSection id="your-rights" title="Your rights">
        <p>
          Under Sri Lanka&apos;s Personal Data Protection Act No. 9 of 2022, you have rights regarding the personal
          information we hold about you, including the right to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-grey-900">Access:</span> request confirmation and a copy of your personal
            data held in SwiftDrop.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Correction:</span> ask us to update or correct inaccurate or
            incomplete personal details.
          </li>
          <li>
            <span className="font-semibold text-grey-900">Deletion:</span> request removal of your personal data where
            it is no longer required for active deliveries or legal obligations.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="contact" title="Contact">
        <p>
          If you have questions about this Privacy Policy or wish to exercise your data protection rights, email us at{" "}
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

