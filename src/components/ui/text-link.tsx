import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

const textLinkClass =
  "rounded-sm font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline";

/** Orange-700 text link (DESIGN.md §1). */
export function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return <Link className={cn(textLinkClass, className)} {...props} />;
}

/** A button that looks like TextLink, for actions inside text ("Try loading districts again"). */
export function TextButton({ className, type = "button", ...props }: React.ComponentProps<"button">) {
  return <button type={type} className={cn(textLinkClass, className)} {...props} />;
}
