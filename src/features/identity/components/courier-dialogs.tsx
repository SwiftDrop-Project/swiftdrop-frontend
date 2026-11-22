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
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { TextButton } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toast";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/reference";
import { staffApi } from "../api";
import {
  adminResetPasswordSchema,
  createCourierSchema,
  updateCourierSchema,
  type AdminResetPasswordValues,
  type CreateCourierInput,
  type CreateCourierValues,
  type UpdateCourierInput,
  type UpdateCourierValues,
} from "../schemas";
import type { CourierDetail } from "../types";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/** Formats a stored "+94771234567" number for PhoneInput (which already renders a +94 prefix). */
function phoneForInput(phone: string | null): string {
  if (!phone) return "";
  return phone
    .replace(/^\+94/, "")
    .replace(/^(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/* ---------------------------------------------------------------- Create Courier Dialog */

export function CreateCourierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (courier: CourierDetail) => void;
}) {
  const districts = useDistricts();
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourierInput, unknown, CreateCourierValues>({
    resolver: zodResolver(createCourierSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      branch: "",
      vehicleType: "",
      password: "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setNotice(null);
    }
    onOpenChange(nextOpen);
  }

  const branchPlaceholder =
    districts.status === "loading"
      ? "Loading branches…"
      : districts.status === "error"
        ? "Couldn't load branches"
        : "Select a branch";

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const created = await staffApi.createCourier(values);
      toast({
        tone: "success",
        title: "Courier created",
        description: `${created.fullName} must change their temporary password on first login.`,
      });
      handleOpenChange(false);
      onCreated(created);
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
        const { handled, unmatched } = applyServerFieldErrors(error, setError, [
          "fullName",
          "phone",
          "email",
          "branch",
          "vehicleType",
          "password",
        ]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      setNotice(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add courier</DialogTitle>
          <DialogDescription>
            Create a courier account with an initial password. They&apos;ll be asked to choose a new password on
            first login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody className="gap-5">
            {notice ? (
              <InlineNotice tone="error" title="We couldn't create the courier">
                {notice}
              </InlineNotice>
            ) : null}

            <FormField id="create-courier-fullName" label="Full name" error={errors.fullName?.message}>
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register("fullName")}
                  size="md"
                  autoComplete="off"
                  placeholder="e.g. Kamal Jayawardena"
                />
              )}
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <FormField id="create-courier-phone" label="Mobile number" error={errors.phone?.message}>
                {(a11y) => (
                  <PhoneInput {...a11y} {...register("phone")} size="md" placeholder="77 123 4567" />
                )}
              </FormField>

              <FormField id="create-courier-email" label="Login email" error={errors.email?.message}>
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register("email")}
                    type="email"
                    size="md"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="courier@swiftdrop.lk"
                  />
                )}
              </FormField>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <FormField
                id="create-courier-branch"
                label="Branch"
                error={errors.branch?.message}
                helper={
                  districts.status === "error" ? (
                    <TextButton onClick={districts.retry}>Try loading branches again</TextButton>
                  ) : undefined
                }
              >
                {(a11y) => (
                  <Select
                    {...a11y}
                    {...register("branch")}
                    size="md"
                    disabled={districts.status !== "ready"}
                  >
                    <option value="" disabled>
                      {branchPlaceholder}
                    </option>
                    {districts.districts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>

              <FormField
                id="create-courier-vehicleType"
                label="Vehicle type"
                error={errors.vehicleType?.message}
              >
                {(a11y) => (
                  <Select {...a11y} {...register("vehicleType")} size="md">
                    <option value="" disabled>
                      Select a vehicle type
                    </option>
                    {VEHICLE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>

            <FormField
              id="create-courier-password"
              label="Initial password"
              helper="At least 8 characters, including a number. Required to be changed on first login."
              error={errors.password?.message}
            >
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  {...register("password")}
                  size="md"
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>
              Create courier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Edit Courier Dialog */

export function EditCourierDialog({
  courier,
  open,
  onOpenChange,
  onUpdated,
}: {
  courier: CourierDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (courier: CourierDetail) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit courier details</DialogTitle>
          <DialogDescription>
            Update profile, branch, vehicle type or login email for {courier?.fullName ?? "this courier"}.
          </DialogDescription>
        </DialogHeader>

        {open && courier ? (
          <EditCourierForm
            key={`${courier.id}-${courier.updatedAt}`}
            courier={courier}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditCourierForm({
  courier,
  onClose,
  onUpdated,
}: {
  courier: CourierDetail;
  onClose: () => void;
  onUpdated: (courier: CourierDetail) => void;
}) {
  const districts = useDistricts();
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCourierInput, unknown, UpdateCourierValues>({
    resolver: zodResolver(updateCourierSchema),
    defaultValues: {
      fullName: courier.fullName,
      phone: phoneForInput(courier.phone),
      email: courier.email,
      branch: courier.branch ?? "",
      vehicleType: courier.vehicleType ?? "",
    },
  });

  const currentEmail = useWatch({ control, name: "email" }) ?? "";
  const emailChanged = currentEmail.trim().toLowerCase() !== courier.email.toLowerCase();

  const branchPlaceholder =
    districts.status === "loading"
      ? "Loading branches…"
      : districts.status === "error"
        ? "Couldn't load branches"
        : "Select a branch";

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const updated = await staffApi.updateCourier(courier.id, values);
      toast({
        tone: "success",
        title: "Courier details updated",
        description: emailChanged
          ? `${updated.fullName}'s login email was updated and active sessions were signed out.`
          : `${updated.fullName}'s details have been saved.`,
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
        const { handled, unmatched } = applyServerFieldErrors(error, setError, [
          "fullName",
          "phone",
          "email",
          "branch",
          "vehicleType",
        ]);
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
          <InlineNotice tone="error" title="We couldn't update the courier">
            {notice}
          </InlineNotice>
        ) : null}

        <FormField id="edit-courier-fullName" label="Full name" error={errors.fullName?.message}>
          {(a11y) => <Input {...a11y} {...register("fullName")} size="md" autoComplete="off" />}
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <FormField id="edit-courier-phone" label="Mobile number" error={errors.phone?.message}>
            {(a11y) => (
              <PhoneInput {...a11y} {...register("phone")} size="md" placeholder="77 123 4567" />
            )}
          </FormField>

          <FormField
            id="edit-courier-email"
            label="Login email"
            helper="Changing the email signs the courier out of active sessions."
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
          <InlineNotice tone="info" title="Login email will change">
            Active sessions for {courier.email} will end immediately and the courier will sign in with{" "}
            {currentEmail.trim().toLowerCase()}.
          </InlineNotice>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <FormField
            id="edit-courier-branch"
            label="Branch"
            error={errors.branch?.message}
            helper={
              districts.status === "error" ? (
                <TextButton onClick={districts.retry}>Try loading branches again</TextButton>
              ) : undefined
            }
          >
            {(a11y) => (
              <Select
                {...a11y}
                {...register("branch")}
                size="md"
                disabled={districts.status !== "ready"}
              >
                <option value="" disabled>
                  {branchPlaceholder}
                </option>
                {districts.districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="edit-courier-vehicleType" label="Vehicle type" error={errors.vehicleType?.message}>
            {(a11y) => (
              <Select {...a11y} {...register("vehicleType")} size="md">
                <option value="" disabled>
                  Select a vehicle type
                </option>
                {VEHICLE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
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

/* ---------------------------------------------------------------- Reset Courier Password Dialog */

export function ResetCourierPasswordDialog({
  courier,
  open,
  onOpenChange,
  onReset,
}: {
  courier: CourierDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: (courier: CourierDetail) => void;
}) {
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminResetPasswordValues>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setNotice(null);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!courier) return;
    setNotice(null);
    try {
      const updated = await staffApi.resetCourierPassword(courier.id, {
        newPassword: values.newPassword,
      });
      toast({
        tone: "success",
        title: "Temporary password set",
        description: `${updated.fullName} has been signed out and must choose a new password on next login.`,
      });
      handleOpenChange(false);
      onReset(updated);
    } catch (error) {
      if (!isApiError(error)) {
        setNotice(UNKNOWN_ERROR);
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["newPassword"]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      setNotice(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset courier password</DialogTitle>
          <DialogDescription>
            Set a replacement password for {courier?.fullName ?? "this courier"}. Their active sessions will end
            immediately and they&apos;ll be required to choose a new password when they next log in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody className="gap-5">
            {notice ? (
              <InlineNotice tone="error" title="We couldn't reset the password">
                {notice}
              </InlineNotice>
            ) : null}

            <FormField
              id="reset-courier-newPassword"
              label="Replacement password"
              helper="At least 8 characters, including a number."
              error={errors.newPassword?.message}
            >
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  {...register("newPassword")}
                  size="md"
                  autoComplete="new-password"
                />
              )}
            </FormField>

            <FormField
              id="reset-courier-confirmPassword"
              label="Confirm replacement password"
              error={errors.confirmPassword?.message}
            >
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  {...register("confirmPassword")}
                  size="md"
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Block & Remove Confirmations */

export function BlockCourierDialog({
  courier,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  courier: CourierDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (courier: CourierDetail) => void;
  loading?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {courier?.fullName ?? "this courier"}?</AlertDialogTitle>
          <AlertDialogDescription>
            {courier?.fullName ?? "This courier"} will be signed out immediately, cannot log in, and won&apos;t
            be eligible for new parcel assignments until unblocked. Existing parcel records stay intact.
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
              variant="danger"
              loading={loading}
              onClick={(event) => {
                if (!courier) return;
                event.preventDefault();
                onConfirm(courier);
              }}
            >
              Block courier
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveCourierDialog({
  courier,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  courier: CourierDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (courier: CourierDetail) => void;
  loading?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {courier?.fullName ?? "this courier"}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deactivates {courier?.fullName ?? "the courier"}&apos;s account while keeping their
            past parcel and delivery history. Removed courier accounts cannot be unblocked or restored.
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
              variant="danger"
              loading={loading}
              onClick={(event) => {
                if (!courier) return;
                event.preventDefault();
                onConfirm(courier);
              }}
            >
              Remove courier
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
