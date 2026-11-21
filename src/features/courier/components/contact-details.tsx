import { Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "../types";

/**
 * A pickup or delivery contact: name and full address as a key/value list, then the actions for it: call (a tel:
 * link that keeps the number visible) and, when the courier is heading to this contact, Get directions.
 */
export function ContactDetails({
  contact,
  districtName,
  directions = false,
  className,
}: {
  contact: Contact;
  districtName: (code: string) => string;
  /** The courier's next stop is this contact (see `directionsContact`): offer Get directions. */
  directions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
        <dt className="text-grey-600">Name</dt>
        <dd className="min-w-0 break-words">{contact.name}</dd>
        <dt className="text-grey-600">Address</dt>
        <dd className="min-w-0 break-words">{fullAddress(contact, districtName)}</dd>
      </dl>
      <ContactActions contact={contact} districtName={districtName} directions={directions} />
    </div>
  );
}

/**
 * Call (always, the number stays visible) and Get directions (only when asked for). 44px tall on phones; they sit
 * side by side and wrap onto two lines on a narrow card instead of squeezing.
 */
export function ContactActions({
  contact,
  districtName,
  directions,
  className,
}: {
  contact: Contact;
  districtName: (code: string) => string;
  directions: boolean;
  className?: string;
}) {
  const phone = formatPhone(contact.phone);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button asChild variant="secondary" className="h-11 sm:h-10">
        <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name} on ${phone}`}>
          <Phone aria-hidden="true" />
          <span className="tabular-nums">{phone}</span>
        </a>
      </Button>
      {directions ? (
        <Button asChild variant="secondary" className="h-11 sm:h-10">
          <a
            href={directionsHref(contact, districtName)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Get directions to ${contact.name} (opens Google Maps in a new tab)`}
          >
            <Navigation aria-hidden="true" />
            Get directions
          </a>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Google Maps directions to this contact's address, as the API sent it (street, city, district, country): no
 * coordinates, no stored locations, no Maps API key. The destination is URL-encoded.
 */
export function directionsHref(contact: Contact, districtName: (code: string) => string): string {
  const destination = `${fullAddress(contact, districtName)}, Sri Lanka`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * "14 Temple Road, Ja-Ela, Gampaha": the street address, then the city and district, without saying a name twice
 * (no city when the street address already ends with it; no district when it is the city's own name).
 */
export function fullAddress(contact: Contact, districtName: (code: string) => string): string {
  const street = contact.address.trim().replace(/,\s*$/, "");
  const place = cityAndDistrict(contact, districtName);
  const city = contact.city.trim().toLowerCase();
  if (city && street.toLowerCase().endsWith(city)) {
    const district = districtName(contact.district);
    return district.trim().toLowerCase() === city ? street : `${street}, ${district}`;
  }
  return street ? `${street}, ${place}` : place;
}

/** "Maharagama, Colombo", or just "Kandy" when the city and district have the same name. */
export function cityAndDistrict(contact: Contact, districtName: (code: string) => string): string {
  const district = districtName(contact.district);
  const same = contact.city.trim().toLowerCase() === district.trim().toLowerCase();
  return same ? contact.city : `${contact.city}, ${district}`;
}

/** A phone number as a tel: text link with a phone icon (the number stays visible). */
export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <TextLink href={`tel:${phone}`} className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <Phone className="size-4 shrink-0" aria-hidden="true" />
      {formatPhone(phone)}
    </TextLink>
  );
}
