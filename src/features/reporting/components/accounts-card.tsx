import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "../lib/labels";
import type { AccountCounts } from "../types";

const ROWS: { key: keyof Omit<AccountCounts, "total" | "pendingMerchants">; label: string; href?: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "merchants", label: "Merchants", href: "/admin/merchants" },
  { key: "couriers", label: "Couriers", href: "/admin/couriers" },
  { key: "dispatchers", label: "Dispatchers", href: "/admin/dispatchers" },
  { key: "admins", label: "Admins" },
];

/** Accounts per role, and the merchants waiting for approval. `users` null shows placeholders. */
export function AccountsCard({ users }: { users: AccountCounts | null }) {
  return (
    <Card aria-labelledby="overview-accounts-heading" className="flex flex-col">
      <CardHeader
        title="Accounts"
        titleId="overview-accounts-heading"
        description="Every account except removed ones"
        aside={
          users ? (
            <span className="text-h2 text-grey-900 tabular-nums">{formatCount(users.total)}</span>
          ) : (
            <Skeleton className="h-7 w-12" />
          )
        }
      />
      <CardContent className="flex flex-1 flex-col gap-6">
        <dl className="flex flex-col">
          {ROWS.map(({ key, label, href }) => (
            <div key={key} className="flex items-center justify-between gap-4 border-b border-grey-100 py-3 last:border-0">
              <dt className="text-body-sm text-grey-700">
                {href ? (
                  <Link href={href} className="hover:text-grey-900 hover:underline">
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </dt>
              <dd className="text-label text-grey-900 tabular-nums">
                {users ? formatCount(users[key]) : <Skeleton className="h-5 w-8" />}
              </dd>
            </div>
          ))}
        </dl>

        {users === null ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : users.pendingMerchants > 0 ? (
          <div className="mt-auto flex flex-col gap-3 rounded-lg border border-grey-200 bg-grey-50 p-4">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-grey-700" aria-hidden="true" />
              <p className="text-body-sm text-grey-800">
                <span className="text-label text-grey-900 tabular-nums">{formatCount(users.pendingMerchants)}</span>{" "}
                {users.pendingMerchants === 1 ? "merchant is" : "merchants are"} waiting for approval.
              </p>
            </div>
            <Button asChild className="w-full sm:w-fit">
              <Link href="/admin/merchants">
                Review merchants
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="mt-auto text-body-sm text-grey-600">No merchants are waiting for approval.</p>
        )}
      </CardContent>
    </Card>
  );
}
