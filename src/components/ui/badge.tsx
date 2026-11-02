import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge tones (DESIGN.md §10). There is deliberately no orange tone: orange is for actions,
 * never for status.
 * - outline: white with a hollow dot, for "waiting" states (Pending pickup)
 * - neutral: grey, for states in progress
 * - success / error: delivery outcomes only
 */
export type BadgeTone = "outline" | "neutral" | "success" | "error";

const TONE_CLASS: Record<BadgeTone, string> = {
  outline: "border-grey-300 bg-white text-grey-800",
  neutral: "border-grey-200 bg-grey-50 text-grey-800",
  success: "border-success/20 bg-success-tint text-success",
  error: "border-error/20 bg-error-tint text-error",
};

const DOT_CLASS: Record<BadgeTone, string> = {
  outline: "border border-grey-500 bg-white",
  neutral: "bg-grey-600",
  success: "bg-success",
  error: "bg-error",
};

interface BadgeProps extends React.ComponentProps<"span"> {
  tone?: BadgeTone;
  /** A dot before the word. Status badges always have one, so they read without colour too. */
  dot?: boolean;
}

/** Small label: dot + word, caption text, sm radius. */
export function Badge({ tone = "neutral", dot = true, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-sm border px-2 text-caption whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[tone])} /> : null}
      {children}
    </span>
  );
}
