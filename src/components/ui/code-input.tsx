"use client";

import * as React from "react";
import { fieldControlBase } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  /** The digits typed so far, e.g. "4821". */
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  length?: number;
  /** Goes on the first box, so a FormField label focuses it. */
  id?: string;
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Read by screen readers for the whole group, e.g. "Verification code". */
  label?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

const onlyDigits = (text: string) => text.replace(/\D/g, "");

/**
 * One-time code in separate boxes (6 by default). Digits only; typing moves to the next box,
 * Backspace and the arrow keys move back, and pasting a code fills the boxes from the focused one.
 * Phones offer the code from the SMS through autoComplete="one-time-code".
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  id,
  name,
  disabled,
  autoFocus,
  label = "Verification code",
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  className,
}: CodeInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  function focusBox(index: number) {
    const box = refs.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  }

  /** Writes the digits in `text` starting at box `start`, then moves focus past them. */
  function fill(start: number, text: string) {
    const incoming = onlyDigits(text);
    if (!incoming) return;
    const next = digits.slice();
    for (let offset = 0; offset < incoming.length && start + offset < length; offset += 1) {
      next[start + offset] = incoming[offset];
    }
    // Keep the value contiguous: stop at the first empty box.
    const firstGap = next.indexOf("");
    const joined = (firstGap === -1 ? next : next.slice(0, firstGap)).join("");
    onChange(joined);
    focusBox(start + incoming.length);
    if (joined.length === length) onComplete?.(joined);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1));
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className={cn("flex gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          id={index === 0 ? id : undefined}
          name={index === 0 ? name : undefined}
          value={digit}
          // Boxes fill in order, so focusing a box past the first empty one jumps back to it.
          onFocus={(event) => {
            if (index > value.length) focusBox(value.length);
            else event.currentTarget.select();
          }}
          onChange={(event) => {
            const typed = event.target.value;
            // Typing into a filled box replaces its digit; autofill and fast typing can bring several.
            fill(index, digit && typed.length > 1 ? typed.replace(digit, "") : typed);
          }}
          onKeyDown={(event) => onKeyDown(event, index)}
          onPaste={(event) => {
            event.preventDefault();
            fill(Math.min(index, value.length), event.clipboardData.getData("text"));
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid}
          className={cn(fieldControlBase, "h-12 w-12 px-0 text-center text-h2 tabular-nums")}
        />
      ))}
    </div>
  );
}
