// Shared API code. Each feature's endpoints live in src/features/<module>/api.ts and use apiFetch.
export { ApiError, apiFetch, apiUrl, backendOrigin, isApiError, retryMessage } from "./client";
export { metaApi } from "./meta";
