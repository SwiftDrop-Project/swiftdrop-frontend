/*
 * Email helpers for the sign-up and verification screens. The emailed code proves the address; these only
 * catch typos early and keep the address short on screen.
 */

/** Well-known typos of popular email domains → the domain the person meant. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.lk": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
};

/** Popular domains: a domain one keystroke away from one of these is probably a typo. */
const POPULAR_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com"];

/** Real domains that are one keystroke from a popular one; never "fix" these. */
const REAL_LOOKALIKES = new Set(["mail.com", "email.com", "ymail.com", "gmx.com", "live.co.uk", "love.com"]);

/** True when `a` becomes `b` with one insertion, deletion, substitution or swap of neighbours. */
function oneEditApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diffs: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diffs.push(i);
    if (diffs.length === 1) return true;
    const [first, second] = diffs;
    return (
      diffs.length === 2 && second === first + 1 && a[first] === b[second] && a[second] === b[first]
    );
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < shorter.length && shorter[i] === longer[i]) i += 1;
  return shorter.slice(i) === longer.slice(i + 1);
}

/**
 * The address the person probably meant, e.g. "name@gmial.com" → "name@gmail.com", or null when the
 * domain looks fine (or the input isn't an email yet).
 */
export function suggestEmailFix(value: string): string | null {
  const email = value.trim();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (POPULAR_DOMAINS.includes(domain) || REAL_LOOKALIKES.has(domain)) return null;
  const fixed = DOMAIN_TYPOS[domain] ?? POPULAR_DOMAINS.find((popular) => oneEditApart(domain, popular));
  return fixed ? `${local}@${fixed}` : null;
}

/** "ayesha@gmail.com" → "a•••@gmail.com" (the same masking as the backend's email log). */
export function maskEmail(email: string): string {
  const value = email.trim();
  const at = value.lastIndexOf("@");
  if (at <= 0) return value ? `${value[0]}•••` : "•••";
  return `${value[0]}•••${value.slice(at)}`;
}
