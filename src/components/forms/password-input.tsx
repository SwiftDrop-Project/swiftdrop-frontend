"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password field with a show/hide eye button (DESIGN.md §7). */
export function PasswordInput({ className, id, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label="Show password"
        aria-pressed={visible}
        aria-controls={id}
        className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-grey-700 hover:bg-grey-50 hover:text-grey-900"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
