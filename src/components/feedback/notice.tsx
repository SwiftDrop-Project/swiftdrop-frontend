import * as React from "react";
import { CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoticeProps {
  tone?: "info" | "error";
  title: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Inline notice (DESIGN.md §10): grey-50 fill with an info icon, or error-tint with error text.
 * Error notices use role="alert" so screen readers announce them when they appear.
 */
export function Notice({ tone = "info", title, children, className }: NoticeProps) {
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        tone === "error"
          ? "border-error/20 bg-error-tint text-error"
          : "border-grey-200 bg-grey-50 text-grey-900",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", tone === "error" ? "text-error" : "text-grey-700")}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="text-label font-semibold">{title}</p>
        {children ? (
          <div className={cn("text-body-sm", tone === "error" ? "text-error" : "text-grey-700")}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
