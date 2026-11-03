"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Short confirmation after an action ("Delivery created"). Call `toast(...)` from any client code;
 * <Toaster /> is mounted once in the root layout. For problems the user must fix on the page,
 * use InlineNotice instead: toasts disappear.
 */

type ToastTone = "info" | "success" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before it closes; errors stay longer. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  open: boolean;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ToastItem[] = [];

/** Shows a toast. Returns its id. */
export function toast(options: ToastOptions): number {
  const id = nextId++;
  emit([...items, { ...options, id, open: true }].slice(-3));
  return id;
}

function close(id: number) {
  emit(items.map((item) => (item.id === id ? { ...item, open: false } : item)));
  // Remove it after the closing animation.
  window.setTimeout(() => emit(items.filter((item) => item.id !== id)), 200);
}

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-grey-700" },
  success: { icon: CircleCheck, className: "text-success" },
  error: { icon: CircleAlert, className: "text-error" },
};

export function Toaster() {
  const toasts = React.useSyncExternalStore(subscribe, () => items, () => EMPTY);

  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
      {toasts.map(({ id, open, tone = "info", title, description, duration }) => {
        const { icon: Icon, className } = TONES[tone];
        return (
          <ToastPrimitive.Root
            key={id}
            open={open}
            onOpenChange={(next) => {
              if (!next) close(id);
            }}
            duration={duration ?? (tone === "error" ? 8000 : 5000)}
            type={tone === "error" ? "foreground" : "background"}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-grey-200 bg-white p-4 shadow-overlay",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:animate-out",
            )}
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <ToastPrimitive.Title className="text-label font-semibold text-grey-900">{title}</ToastPrimitive.Title>
              {description ? (
                <ToastPrimitive.Description className="text-body-sm text-grey-600">
                  {description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Close"
              className="-mt-2 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-grey-700 hover:bg-grey-50 hover:text-grey-900"
            >
              <X className="size-5" aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="pointer-events-none fixed right-0 bottom-0 z-50 flex w-full flex-col gap-2 p-4 outline-none sm:max-w-sm sm:p-6" />
    </ToastPrimitive.Provider>
  );
}
