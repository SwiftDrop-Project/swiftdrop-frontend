import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Control heights (DESIGN.md §6-7): "lg" 48px on auth screens and page-level forms, "md" 40px in the app. */
export type ControlSize = "md" | "lg";

/** Border, focus ring, error and disabled styles shared by every text control. */
export const fieldControlBase = cn(
  "w-full min-w-0 rounded-md border border-grey-300 bg-white px-4 text-body text-grey-900 transition-colors outline-none",
  "placeholder:text-grey-500",
  "focus-visible:border-orange-600 focus-visible:ring-3 focus-visible:ring-orange-100",
  "disabled:cursor-not-allowed disabled:bg-grey-50 disabled:text-grey-400",
  "aria-invalid:border-error aria-invalid:focus-visible:ring-error-tint",
);

/** Text inputs and native selects. */
export const fieldControlVariants = cva(fieldControlBase, {
  variants: {
    size: {
      md: "h-10",
      lg: "h-12",
    },
  },
  defaultVariants: { size: "lg" },
});

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  /** 48px by default; "md" is 40px. */
  size?: ControlSize;
};

function Input({ className, type = "text", size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldControlVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input };
