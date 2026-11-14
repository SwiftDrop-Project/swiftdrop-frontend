/** The merchant's webhook pages. */
export const WEBHOOKS_HREF = "/merchant/webhooks";

/** One webhook: its delivery history and setup guide. */
export function webhookHref(id: string): string {
  return `${WEBHOOKS_HREF}/${encodeURIComponent(id)}`;
}
