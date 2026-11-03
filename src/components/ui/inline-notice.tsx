import * as React from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "error";

interface InlineNoticeProps {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

const TONES: Record<Tone, { icon: typeof Info; box: string; icon_: string; body: string }> = {
  info: {
    icon: Info,
    box: "border-grey-200 bg-grey-50 text-grey-900",
    icon_: "text-grey-700",
    body: "text-grey-700",
  },
  success: {
    icon: CircleCheck,
    box: "border-success/20 bg-success-tint text-success",
    icon_: "text-success",
    body: "text-success",
  },
  error: {
    icon: CircleAlert,
    box: "border-error/20 bg-error-tint text-error",
    icon_: "text-error",
    body: "text-error",
  },
};

/**
 * Inline notice (DESIGN.md §10): grey-50 fill with an info icon, success-tint for a finished action,
 * error-tint with error text for problems. Error notices use role="alert" so screen readers announce
 * them when they appear; the others use role="status".
 */
export function InlineNotice({ tone = "info", title, children, className }: InlineNoticeProps) {
  const { icon: Icon, box, icon_, body } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-4", box, className)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon_)} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-label font-semibold">{title}</p>
        {children ? <div className={cn("text-body-sm", body)}>{children}</div> : null}
      </div>
    </div>
  );
}
