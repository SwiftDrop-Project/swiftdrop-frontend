import { TextLink } from "@/components/ui/text-link";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "../types";

/** A pickup or delivery contact as a key/value list. The mobile number is a tel: link, so it can be called. */
export function ContactDetails({
  contact,
  districtName,
  className,
}: {
  contact: Contact;
  districtName: (code: string) => string;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm", className)}>
      <dt className="text-grey-600">Name</dt>
      <dd className="min-w-0 break-words">{contact.name}</dd>
      <dt className="text-grey-600">Mobile</dt>
      <dd>
        <PhoneLink phone={contact.phone} />
      </dd>
      <dt className="text-grey-600">Address</dt>
      <dd className="min-w-0 break-words">{contact.address}</dd>
      <dt className="text-grey-600">City</dt>
      <dd className="min-w-0 break-words">
        {cityAndDistrict(contact, districtName)}
      </dd>
    </dl>
  );
}

/** "Maharagama, Colombo", or just "Kandy" when the city and district have the same name. */
export function cityAndDistrict(contact: Contact, districtName: (code: string) => string): string {
  const district = districtName(contact.district);
  const same = contact.city.trim().toLowerCase() === district.trim().toLowerCase();
  return same ? contact.city : `${contact.city}, ${district}`;
}

export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <TextLink href={`tel:${phone}`} className={cn("tabular-nums", className)}>
      {formatPhone(phone)}
    </TextLink>
  );
}
