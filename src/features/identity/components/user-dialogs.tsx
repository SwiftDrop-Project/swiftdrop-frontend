"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { ROLE_LABEL } from "@/lib/roles";
import { userAdminApi } from "../api";
import { updateUserSchema, type UpdateUserInput, type UpdateUserValues } from "../schemas";
import type { AdminUser, AdminUserDetail } from "../types";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/** "+94771234567" → "77 123 4567" for PhoneInput (which already shows the +94 prefix). */
function phoneForInput(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/^\+94/, "").replace(/^(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/* ---------------------------------------------------------------- Edit */

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onUpdated,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (user: AdminUserDetail) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit account details</DialogTitle>
          <DialogDescription>
            Update the name, mobile number or email of {user?.fullName ?? "this account"}. Role and status can&apos;t
            be changed here.
          </DialogDescription>
        </DialogHeader>
        {open && user ? (
          <EditUserForm key={user.id} user={user} onClose={() => onOpenChange(false)} onUpdated={onUpdated} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (user: AdminUserDetail) => void;
}) {
  const [notice, setNotice] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput, unknown, UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { fullName: user.fullName, phone: phoneForInput(user.phone), email: user.email },
  });

  const currentEmail = useWatch({ control, name: "email" }) ?? "";
  const emailChanged = currentEmail.trim().toLowerCase() !== user.email.toLowerCase();

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const updated = await userAdminApi.updateUser(user.id, values);
      toast({
        tone: "success",
        title: "Account details saved",
        description: emailChanged
          ? `${updated.fullName}'s email was changed and they were logged out everywhere.`
          : `${updated.fullName}'s details are up to date.`,
      });
      onClose();
      onUpdated(updated);
    } catch (error) {
      if (!isApiError(error)) {
        setNotice(UNKNOWN_ERROR);
        return;
      }
      if (error.code === "EMAIL_ALREADY_REGISTERED") {
        setError("email", { message: error.message });
        return;
      }
      if (error.code === "PHONE_ALREADY_REGISTERED") {
        setError("phone", { message: error.message });
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["fullName", "phone", "email"]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      setNotice(error.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <DialogBody className="gap-5">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't save these details">
            {notice}
          </InlineNotice>
        ) : null}

        <FormField id="edit-user-fullName" label="Full name" error={errors.fullName?.message}>
          {(a11y) => <Input {...a11y} {...register("fullName")} size="md" autoComplete="off" />}
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <FormField id="edit-user-phone" label="Mobile number" error={errors.phone?.message}>
            {(a11y) => <PhoneInput {...a11y} {...register("phone")} size="md" placeholder="77 123 4567" />}
          </FormField>
          <FormField
            id="edit-user-email"
            label="Email"
            helper="A new email logs the user out everywhere."
            error={errors.email?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register("email")}
                type="email"
                size="md"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </FormField>
        </div>

        {emailChanged ? (
          <InlineNotice tone="info" title="The login email will change">
            {user.fullName} will be logged out and will log in with {currentEmail.trim().toLowerCase()} from now on.
          </InlineNotice>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ---------------------------------------------------------------- Block / unblock */

export type StatusChange = "BLOCKED" | "ACTIVE";

/** Asks before blocking or unblocking. `change` says which; the dialog stays open while `loading`. */
export function ChangeUserStatusDialog({
  user,
  change,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  user: AdminUser | null;
  change: StatusChange;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (user: AdminUser) => void;
  loading?: boolean;
}) {
  const name = user?.fullName ?? "this account";
  const role = user ? ROLE_LABEL[user.role].toLowerCase() : "user";
  const blocking = change === "BLOCKED";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{blocking ? `Block ${name}?` : `Unblock ${name}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocking
              ? `This ${role} will be logged out at once and won't be able to log in until you unblock the account. Their deliveries and history stay as they are.`
              : `This ${role} will be able to log in again straight away.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={loading}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={blocking ? "danger" : "primary"}
              loading={loading}
              onClick={(event) => {
                if (!user) return;
                event.preventDefault();
                onConfirm(user);
              }}
            >
              {blocking ? "Block account" : "Unblock account"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Runs a block or unblock with toasts. Returns the updated account, or null when it failed. */
export async function changeUserStatus(user: AdminUser, change: StatusChange): Promise<AdminUserDetail | null> {
  try {
    const updated = await userAdminApi.setStatus(user.id, change);
    toast(
      change === "BLOCKED"
        ? { tone: "info", title: `${updated.fullName} blocked`, description: "They were logged out and can't log in." }
        : { tone: "success", title: `${updated.fullName} unblocked`, description: "They can log in again." },
    );
    return updated;
  } catch (error) {
    toast({
      tone: "error",
      title: change === "BLOCKED" ? `We couldn't block ${user.fullName}` : `We couldn't unblock ${user.fullName}`,
      description: isApiError(error) ? error.message : "Try again in a moment.",
    });
    return null;
  }
}
