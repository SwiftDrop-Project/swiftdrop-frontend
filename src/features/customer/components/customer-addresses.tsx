"use client";

import { MapPin } from "lucide-react";
import * as React from "react";
import { PageColumns } from "@/components/layout/page-columns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { humanizeCode } from "@/lib/format";
import { customerApi } from "../api";
import { useAddresses } from "../hooks/use-addresses";
import type { CustomerAddress } from "../types";
import { AddressCard } from "./address-card";
import { AddressForm } from "./address-form";

const MAX_ADDRESSES = 20;

function errorText(error: unknown): string {
  return isApiError(error) ? error.message : "Something went wrong on our side. Try again in a moment.";
}

/**
 * /customer/addresses: the saved pickup and drop-off addresses (GET /customer/addresses), the default pickup address
 * first, with the "Add address" form beside them (below them on smaller screens). "Edit" fills the same form with
 * that address; "Make default" and "Delete" (after a confirmation) change the list straight away. Up to 20 addresses.
 */
export function CustomerAddresses() {
  const { state, reload } = useAddresses();
  const districts = useDistricts();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<CustomerAddress | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const addresses = state.status === "ready" ? state.addresses : [];
  const editing = addresses.find((address) => address.id === editingId);
  const hasDefault = addresses.some((address) => address.isDefault);
  const full = addresses.length >= MAX_ADDRESSES;

  const districtName = (code: string) =>
    districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);

  function startEdit(id: string) {
    setEditingId(id);
    // The form is below the list on smaller screens: bring it into view.
    document.getElementById("address-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function makeDefault(address: CustomerAddress) {
    setBusyId(address.id);
    try {
      await customerApi.makeDefaultAddress(address.id);
      toast({ tone: "success", title: `“${address.label}” is your default pickup address` });
      reload();
    } catch (error) {
      toast({ tone: "error", title: "We couldn't change your default address", description: errorText(error) });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await customerApi.deleteAddress(deleting.id);
      toast({ tone: "success", title: `“${deleting.label}” deleted` });
      if (editingId === deleting.id) setEditingId(null);
      setDeleting(null);
      reload();
    } catch (error) {
      setDeleteError(errorText(error));
    } finally {
      setBusyId(null);
    }
  }

  const form = full && !editing ? (
    <Card>
      <CardContent className="p-6">
        <InlineNotice tone="info" title="You have 20 saved addresses">
          That&rsquo;s the most you can save. Delete one to add another.
        </InlineNotice>
      </CardContent>
    </Card>
  ) : (
    <AddressForm
      key={editing?.id ?? "new"}
      address={editing}
      hasDefault={hasDefault}
      districts={districts}
      onSaved={() => {
        setEditingId(null);
        reload();
      }}
      onCancel={() => setEditingId(null)}
    />
  );

  return (
    <>
      <PageColumns aside={<div id="address-form" className="scroll-mt-6">{form}</div>}>
        {state.status === "loading" ? <LoadingCards /> : null}

        {state.status === "error" ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load your addresses">
                {state.message}
              </InlineNotice>
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "ready" && addresses.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-10">
              <EmptyState
                icon={MapPin}
                title="No saved addresses yet"
                description="Add your home, shop or office once, and pick it when you create a delivery."
              />
            </CardContent>
          </Card>
        ) : null}

        {addresses.length > 0 ? (
          <ul className="flex flex-col gap-4" aria-label="Saved addresses">
            {addresses.map((address) => (
              <li key={address.id}>
                <AddressCard
                  address={address}
                  districtName={districtName(address.district)}
                  editing={address.id === editingId}
                  busy={busyId !== null}
                  onMakeDefault={() => void makeDefault(address)}
                  onEdit={() => startEdit(address.id)}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleting(address);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </PageColumns>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.isDefault
                ? "It's your default pickup address, so you won't have a default until you choose another. "
                : ""}
              Deliveries you already booked keep their addresses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <InlineNotice tone="error" title="We couldn't delete the address">
              {deleteError}
            </InlineNotice>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" disabled={busyId !== null}>
                Keep address
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="danger"
                loading={busyId !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
              >
                Delete address
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LoadingCards() {
  return (
    <div aria-busy="true" aria-label="Loading your addresses" className="flex flex-col gap-4">
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardContent className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
