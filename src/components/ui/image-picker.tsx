"use client";

import { Camera, ImageUp, RefreshCw, Trash2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  id: string;
  label: React.ReactNode;
  helper?: React.ReactNode;
  error?: string;
  /** The chosen image, or null. The picker only picks and previews; the caller checks the file. */
  file: File | null;
  onChange: (file: File | null) => void;
  /** Accepted types for the file dialog (a hint only: check the file yourself). */
  accept?: string;
  disabled?: boolean;
  /** Words for the camera button; it opens the back camera on phones (capture="environment"). */
  takePhotoLabel?: string;
  chooseFileLabel?: string;
  className?: string;
}

const sizeFormat = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 1 });

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${sizeFormat.format(bytes / (1024 * 1024))} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Pick one image: "Take photo" (the device camera on phones) or "Choose file", then a preview with Replace and Remove
 * (DESIGN.md §7: label above, helper or error below). The preview is a local object URL that is released when the
 * image changes; nothing is uploaded here.
 */
export function ImagePicker({
  id,
  label,
  helper,
  error,
  file,
  onChange,
  accept = "image/jpeg,image/png,image/webp",
  disabled = false,
  takePhotoLabel = "Take photo",
  chooseFileLabel = "Choose file",
  className,
}: ImagePickerProps) {
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    // Let the same file be picked again after Remove.
    event.target.value = "";
    if (chosen) onChange(chosen);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} role="group" aria-labelledby={`${id}-label`}>
      <Label id={`${id}-label`} htmlFor={`${id}-file`}>
        {label}
      </Label>

      {/* The real file inputs stay hidden; the buttons below open them. */}
      <input
        ref={cameraInput}
        id={`${id}-camera`}
        type="file"
        accept={accept}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={picked}
      />
      <input
        ref={fileInput}
        id={`${id}-file`}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={picked}
      />

      {file && preview ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center",
            error ? "border-error" : "border-grey-200",
          )}
        >
          {/* A local blob: URL of the chosen file, so next/image can't optimise it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview of the chosen image"
            className="h-40 w-full rounded-md border border-grey-200 bg-grey-50 object-contain sm:size-28"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="min-w-0 break-words text-body-sm text-grey-900">{file.name || "Photo"}</p>
            <p className="text-caption text-grey-600 tabular-nums">{fileSize(file.size)}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                type="button"
                variant="secondary"
                className="h-11 sm:h-10"
                disabled={disabled}
                onClick={() => fileInput.current?.click()}
              >
                <RefreshCw aria-hidden="true" />
                Replace
              </Button>
              <Button
                type="button"
                variant="tertiary"
                className="h-11 sm:h-10"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-stretch gap-2 rounded-md border border-dashed p-4 sm:flex-row sm:items-center",
            error ? "border-error" : "border-grey-300",
          )}
        >
          <Button
            type="button"
            variant="secondary"
            className="h-11 sm:h-10"
            disabled={disabled}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera aria-hidden="true" />
            {takePhotoLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 sm:h-10"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            <ImageUp aria-hidden="true" />
            {chooseFileLabel}
          </Button>
        </div>
      )}

      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {!error && helper ? (
        <p id={helperId} className="text-caption font-normal text-grey-600">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
