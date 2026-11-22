import type { Webhook } from "./types";

/*
 * "Same destination", mirroring the backend's CallbackDestination (API.md "One subscription per destination").
 * Ignored: spaces around it, letter case of scheme and host, a non-Latin host vs its xn-- name, a default port
 * written out, an empty path vs "/", and a #fragment. Kept: path (including a trailing slash), query, port, scheme.
 * This is only a hint for the form: the backend's 409 WEBHOOK_URL_IN_USE is the real rule.
 */

/** A comparable key for a callback URL; anything the browser can't parse is compared as written. */
function destinationKey(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (!parsed.host) return trimmed;
    // URL already lower-cases the scheme and host, turns non-Latin hosts into xn-- names and drops default ports.
    const scheme = parsed.protocol.toLowerCase();
    const port = parsed.port || (scheme === "https:" ? "443" : scheme === "http:" ? "80" : "");
    const path = parsed.pathname || "/";
    return `${scheme}//${parsed.hostname.toLowerCase()}:${port}${path}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

/** "shop.example.com/hook" for messages: host and path, without the scheme or query (which can hold tokens). */
export function shortAddress(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.host}${path}`;
  } catch {
    return url.trim();
  }
}

export function sameDestination(first: string, second: string): boolean {
  return destinationKey(first) === destinationKey(second);
}

/** Another webhook (not `exceptId`) that already uses this URL's destination; active ones first. */
export function findSameDestination(url: string, webhooks: readonly Webhook[], exceptId?: string): Webhook | undefined {
  if (url.trim() === "") return undefined;
  const matches = webhooks.filter((webhook) => webhook.id !== exceptId && sameDestination(webhook.url, url));
  return matches.find((webhook) => webhook.active) ?? matches[0];
}
