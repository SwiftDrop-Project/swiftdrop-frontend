import type { ApiErrorBody, ApiErrorCode } from "@/types";

/** Every failed API call throws this. `code` follows the error table in API.md. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const NETWORK_MESSAGE = "We couldn't reach SwiftDrop. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong on our side. Try again in a moment.";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Added to the URL; undefined values are left out. */
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local.");
  }
  return base.replace(/\/+$/, "");
}

/** The backend's origin, e.g. http://localhost:8080 for NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1. */
export function backendOrigin(): string {
  return new URL(apiBase()).origin;
}

function apiUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(apiBase() + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiErrorBody).code === "string" &&
    typeof (value as ApiErrorBody).message === "string"
  );
}

/**
 * The only function in the app that calls `fetch`. Features wrap it in their own api.ts, e.g.
 * `export const deliveryApi = { get: (id: string) => apiFetch<Delivery>(`/deliveries/${id}`) }`.
 * Always sends the SD_TOKEN cookie (credentials: "include") and speaks JSON.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(apiUrl(path, query), {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, code: "NETWORK_ERROR", message: NETWORK_MESSAGE });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      isErrorBody(data)
        ? { ...data, status: response.status }
        : { status: response.status, code: "INTERNAL_ERROR", message: GENERIC_MESSAGE },
    );
  }

  return data as T;
}
