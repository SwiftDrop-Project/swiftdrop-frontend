/** "Ayesha Fernando" → "Ayesha" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** "Ayesha Fernando" → "AF", "Nimal" → "N" */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** "+94771234567" → "+94 77 123 4567" */
export function formatPhone(phone: string): string {
  const match = /^\+94(\d{2})(\d{3})(\d{4})$/.exec(phone);
  return match ? `+94 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** ISO timestamp → "1 Nov 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
}

/** "NUWARA_ELIYA" → "Nuwara Eliya" (fallback when the district list isn't loaded). */
export function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
