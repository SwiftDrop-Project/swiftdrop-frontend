"use client";

import * as React from "react";
import { merchantsApi } from "@/features/merchants";

export interface MerchantOption {
  id: string;
  name: string;
}

/**
 * Approved merchants' business names, for the admin's Webhook Logs (GET /admin/merchants?status=APPROVED; the
 * delivery list itself only has `merchantId`). `merchants` is sorted by name for the merchant filter. If the request
 * fails, the list stays empty and `nameOf` falls back to a short id, so the deliveries still show.
 */
export function useMerchantNames() {
  const [merchants, setMerchants] = React.useState<MerchantOption[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    merchantsApi
      .listMerchants("APPROVED", controller.signal)
      .then((list) =>
        setMerchants(
          list
            .map((merchant) => ({ id: merchant.userId, name: merchant.businessName }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      )
      .catch(() => {
        // names are a nice-to-have here: the deliveries show with short ids instead
      });
    return () => controller.abort();
  }, []);

  const names = React.useMemo(() => new Map(merchants.map((merchant) => [merchant.id, merchant.name])), [merchants]);

  /** The business name, or "Unknown merchant (1a2b3c4d)" for one that isn't approved (any more). */
  const nameOf = React.useCallback(
    (merchantId: string) => names.get(merchantId) ?? `Unknown merchant (${merchantId.slice(0, 8)})`,
    [names],
  );

  return { merchants, nameOf };
}
