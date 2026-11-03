import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/** DESIGN.md §6. One primary button per view; labels are verbs. */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent whitespace-nowrap transition-colors select-none",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-grey-100 disabled:text-grey-400",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        primary: "bg-orange-700 text-white hover:bg-orange-800",
        danger: "bg-error text-white hover:bg-error/90",
        secondary: "border-grey-300 bg-white text-grey-900 hover:bg-grey-50",
        tertiary: "bg-transparent text-grey-700 hover:bg-grey-50 hover:text-grey-900",
        link: "h-auto px-0 text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline disabled:bg-transparent",
      },
      size: {
        default: "h-10 px-4 text-label font-semibold",
        lg: "h-12 px-6 text-h3",
        /** Used by IconButton. */
        icon: "size-10",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Disables the button and shows a spinner while an action runs. */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
