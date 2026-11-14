import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import { ACCOUNT_STATUS } from "../lib/labels";
import type { RecentAccount } from "../types";

/** The newest accounts, newest first. `accounts` null shows placeholders. */
export function NewestAccountsCard({ accounts }: { accounts: RecentAccount[] | null }) {
  return (
    <Card aria-labelledby="overview-newest-heading">
      <CardHeader
        title="Newest accounts"
        titleId="overview-newest-heading"
        description="The latest sign-ups and staff accounts"
      />
      <Table>
        <TableCaption className="sr-only">The 5 newest accounts</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts === null ? (
            <TableLoading columns={4} rows={5} label="Loading the newest accounts" />
          ) : accounts.length === 0 ? (
            <TableEmpty
              columns={4}
              icon={UserPlus}
              title="No accounts yet"
              description="New customers, merchants and staff appear here as soon as their account is created."
            />
          ) : (
            accounts.map((account) => {
              const status = ACCOUNT_STATUS[account.status];
              return (
                <TableRow key={account.id}>
                  <TableCell className="text-label text-grey-900">{account.fullName}</TableCell>
                  <TableCell className="text-grey-700">{ROLE_LABEL[account.role]}</TableCell>
                  <TableCell>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-grey-600 tabular-nums">
                    {formatDateTime(account.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
