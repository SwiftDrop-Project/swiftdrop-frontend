"use client";

import * as React from "react";
import { fieldControlBase } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  /** Ref forwarded to the first digit box (e.g. for react-hook-form focus on error). */
  ref?: React.Ref<HTMLInputElement>;
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

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * One-time code in separate boxes (6 by default). Digits only; typing moves to the next box,
 * Backspace and the arrow keys move back, and pasting a code fills the boxes from the focused one.
 * Phones offer the code from the SMS through autoComplete="one-time-code".
 */
export function CodeInput({
  ref,
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
  // Kept in sync with `value` on commit and updated synchronously before calling focusBox() so
  // the newly focused box's onFocus handler never reads the previous render's value.length.
  const latestValueRef = React.useRef(value);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusBox = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(length - 1, index));
      const box = refs.current[clamped];
      box?.focus();
      box?.select();
    },
    [length],
  );

  React.useLayoutEffect(() => {
    latestValueRef.current = value;
    // If the parent externally cleared or shortened `value` while a later box had focus, pull focus back.
    const activeIndex = refs.current.indexOf(document.activeElement as HTMLInputElement | null);
    if (activeIndex > value.length) {
      focusBox(value.length);
    }
  }, [value, focusBox]);

  /** Writes the digits in `text` starting at box `start`, then moves focus past them. */
  function fill(start: number, text: string, allowFullReplace = false) {
    const incoming = onlyDigits(text);
    if (!incoming) return;

    const current = latestValueRef.current;
    const isFullReplace = allowFullReplace && incoming.length >= length;
    const startIndex = isFullReplace ? 0 : Math.min(start, current.length);
    const next = isFullReplace
      ? Array.from({ length }, () => "")
      : Array.from({ length }, (_, index) => current[index] ?? "");

    for (let offset = 0; offset < incoming.length && startIndex + offset < length; offset += 1) {
      next[startIndex + offset] = incoming[offset];
    }

    // Keep the value contiguous: stop at the first empty box.
    const firstGap = next.indexOf("");
    const joined = (firstGap === -1 ? next : next.slice(0, firstGap)).join("");

    latestValueRef.current = joined;
    onChange(joined);
    focusBox(startIndex + incoming.length);
    if (joined.length === length && joined !== current) {
      onComplete?.(joined);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    const current = latestValueRef.current;
    if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Prevent the browser from updating the input value so React stays in control.
      // Mobile keyboards fire key="Unidentified" and fall through to onChange instead.
      event.preventDefault();
      fill(index, event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      if (current[index]) {
        const next = current.slice(0, index) + current.slice(index + 1);
        latestValueRef.current = next;
        onChange(next);
      } else if (index > 0) {
        const next = current.slice(0, index - 1);
        latestValueRef.current = next;
        onChange(next);
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(Math.min(index + 1, current.length));
    }
  }

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className={cn("flex gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
            if (index === 0) setRef(ref, element);
          }}
          id={index === 0 ? id : undefined}
          name={index === 0 ? name : undefined}
          value={digit}
          // Boxes fill in order, so focusing a box past the first empty one jumps back to it.
          onFocus={(event) => {
            const currentLength = latestValueRef.current.length;
            if (index > currentLength) focusBox(currentLength);
            else event.currentTarget.select();
          }}
          onChange={(event) => {
            // Desktop digit keys are handled by onKeyDown (preventDefault stops onChange).
            // This path covers: mobile keyboards (key="Unidentified"), OTP autofill, IME.
            const currentDigit = latestValueRef.current[index] ?? "";
            const rawDigits = onlyDigits(event.target.value);
            if (!rawDigits) return;
            if (rawDigits.length >= length) {
              fill(0, rawDigits, true);
              return;
            }
            // Typing into an unselected filled box gives 2 digits; extract only the newly typed digit.
            if (currentDigit && rawDigits.length === 2) {
              const incoming =
                event.target.selectionStart === 1 ? rawDigits[0] : rawDigits.replace(currentDigit, "");
              fill(index, incoming);
              return;
            }
            fill(index, rawDigits);
          }}
          onKeyDown={(event) => onKeyDown(event, index)}
          onPaste={(event) => {
            event.preventDefault();
            fill(index, event.clipboardData.getData("text"), true);
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
