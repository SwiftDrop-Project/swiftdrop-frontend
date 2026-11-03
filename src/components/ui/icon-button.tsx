import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  [
    "inline-flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-grey-100 disabled:text-grey-400",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        /** DESIGN.md §6 icon button: white, grey-300 border. */
        secondary: "border-grey-300 bg-white text-grey-900 hover:bg-grey-50",
        /** No border, for toolbars like the top bar. */
        tertiary: "border-transparent bg-transparent text-grey-700 hover:bg-grey-50 hover:text-grey-900",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

type IconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> & {
  /** What the button does, read by screen readers ("Open menu"). Required: the button has no text. */
  label: string;
  variant?: "secondary" | "tertiary";
  /** Render the child (e.g. a next/link Link) with the button's styles. */
  asChild?: boolean;
};

/** 40px square button with a 20px lucide icon as its only child. */
function IconButton({ className, variant, label, asChild = false, type, ...props }: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="icon-button"
      aria-label={label}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(iconButtonVariants({ variant }), className)}
      {...props}
    />
  );
}

export { IconButton, iconButtonVariants };
