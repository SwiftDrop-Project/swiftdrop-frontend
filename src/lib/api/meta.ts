import type { District } from "@/types";
import { apiFetch } from "./client";

export const metaApi = {
  /** All 25 districts, sorted by name. */
  districts(signal?: AbortSignal) {
    return apiFetch<District[]>("/meta/districts", { signal });
  },
};
