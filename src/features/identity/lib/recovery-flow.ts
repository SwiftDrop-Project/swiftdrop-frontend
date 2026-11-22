import { email as emailRule, normalizeSriLankanMobile } from "@/lib/validation";

/*
 * Per-flow password recovery state carried from /login -> /forgot-password -> /reset-password.
 *
 * Each login-initiated recovery gets a unique flow id in the URL (?flow=…) backed by a tab-scoped
 * sessionStorage entry (with an in-memory fallback when storage is blocked). This keeps:
 * - display email and account identifier distinct (especially for mobile-initiated recovery)
 * - refresh and browser Back working for the same flow
 * - fresh entries (/forgot-password directly, from Help/Settings, or another tab) isolated from old accounts
 * - codes and passwords strictly out of URLs and storage
 */

const STORAGE_PREFIX = "swiftdrop.recovery.";
const memory = new Map<string, RecoveryFlow>();

export type LoginIdentifierClassification =
  | { kind: "empty" }
  | { kind: "email"; identifier: string; raw: string }
  | { kind: "phone"; identifier: string; raw: string }
  | { kind: "invalid" };

export type RecoveryFlow =
  | {
      kind: "bound-email";
      /** Normalized email sent to /auth/password/forgot and /auth/password/reset. */
      identifier: string;
      /** Original trimmed value typed on /login, carried back on "Back to login". */
      loginIdentifier: string;
      /** Email shown to the user (read-only confirmation and masked reset copy). */
      displayEmail: string;
      /** True only after the user explicitly triggers "Send code". */
      codeSent: boolean;
    }
  | {
      kind: "bound-phone";
      /** Normalized +947XXXXXXXX mobile number sent to forgot/resend/reset. */
      identifier: string;
      /** Original trimmed phone value typed on /login, carried back on "Back to login". */
      loginIdentifier: string;
      /** Confirmation email typed by the user (never fetched from the server). */
      confirmationEmail: string | null;
      /** Email displayed (masked) on the reset step; distinct from `identifier`. */
      displayEmail: string | null;
      /** True only after the user explicitly triggers "Send code". */
      codeSent: boolean;
    };

export const MALFORMED_RECOVERY_IDENTIFIER =
  "Enter a valid mobile number or email address, like 077 123 4567 or name@example.com.";

/** Classifies the raw /login identifier field using the shared email and Sri Lankan mobile rules. */
export function classifyLoginIdentifier(raw: string): LoginIdentifierClassification {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };
  if (emailRule.safeParse(trimmed).success) {
    return { kind: "email", identifier: trimmed.toLowerCase(), raw: trimmed };
  }
  const normalizedPhone = normalizeSriLankanMobile(trimmed);
  if (normalizedPhone) {
    return { kind: "phone", identifier: normalizedPhone, raw: trimmed };
  }
  return { kind: "invalid" };
}

function generateFlowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidFlow(value: unknown): value is RecoveryFlow {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.identifier !== "string" ||
    typeof candidate.loginIdentifier !== "string" ||
    typeof candidate.codeSent !== "boolean"
  ) {
    return false;
  }
  if (candidate.kind === "bound-email") {
    return (
      typeof candidate.displayEmail === "string" &&
      emailRule.safeParse(candidate.identifier).success &&
      emailRule.safeParse(candidate.displayEmail).success
    );
  }
  if (candidate.kind === "bound-phone") {
    const validPhone = normalizeSriLankanMobile(candidate.identifier) !== null;
    const validConfirm =
      candidate.confirmationEmail === null ||
      (typeof candidate.confirmationEmail === "string" && emailRule.safeParse(candidate.confirmationEmail).success);
    const validDisplay =
      candidate.displayEmail === null ||
      (typeof candidate.displayEmail === "string" && emailRule.safeParse(candidate.displayEmail).success);
    return validPhone && validConfirm && validDisplay;
  }
  return false;
}

function writeFlow(flowId: string, flow: RecoveryFlow): void {
  memory.set(flowId, flow);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + flowId, JSON.stringify(flow));
  } catch {
    // in-memory fallback is sufficient for this tab
  }
}

export function createBoundEmailFlow(normalizedEmail: string, rawInput: string): string {
  const flowId = generateFlowId();
  writeFlow(flowId, {
    kind: "bound-email",
    identifier: normalizedEmail,
    loginIdentifier: rawInput,
    displayEmail: rawInput,
    codeSent: false,
  });
  return flowId;
}

export function createBoundPhoneFlow(normalizedPhone: string, rawInput: string): string {
  const flowId = generateFlowId();
  writeFlow(flowId, {
    kind: "bound-phone",
    identifier: normalizedPhone,
    loginIdentifier: rawInput,
    confirmationEmail: null,
    displayEmail: null,
    codeSent: false,
  });
  return flowId;
}

export function readRecoveryFlow(flowId: string | null): RecoveryFlow | null {
  if (!flowId) return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + flowId);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidFlow(parsed)) {
        memory.set(flowId, parsed);
        return parsed;
      }
    }
  } catch {
    // fall back to in-memory copy
  }
  const cached = memory.get(flowId);
  return cached && isValidFlow(cached) ? cached : null;
}

export function updateRecoveryFlow(flowId: string, next: RecoveryFlow): void {
  writeFlow(flowId, next);
}

export function clearRecoveryFlow(flowId: string | null): void {
  if (!flowId) return;
  memory.delete(flowId);
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + flowId);
  } catch {
    // ignore storage errors
  }
}
