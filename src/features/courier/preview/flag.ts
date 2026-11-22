/*
 * Courier preview mode (development only). With NEXT_PUBLIC_COURIER_PREVIEW=true in .env.local and `npm run dev`,
 * the courier screens show sample tasks kept in the browser's memory instead of calling the backend. It is off by
 * default, and a production build can never turn it on.
 */

/** Preview runs only when the flag is exactly "true" and this is not a production build. */
export function isCourierPreviewEnabled(flag: string | undefined, nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production" && flag === "true";
}

/*
 * Written out (not through the function) so Next.js replaces both values at build time: in a production build this
 * reads `false`, and the preview code is never reached.
 */
export const COURIER_PREVIEW: boolean =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_COURIER_PREVIEW === "true";
