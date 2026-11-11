"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, CircleQuestionMark, LogOut, Menu, Search, SlidersHorizontal } from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/features/identity";
import { initials } from "@/lib/format";
import { helpItem, SEARCH, settingsHref } from "@/lib/navigation";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/types";

export function TopBar({ role, onOpenMenu }: { role: Role; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center gap-2 border-b border-grey-200 bg-white px-4 lg:px-8">
      <IconButton variant="tertiary" label="Open menu" onClick={onOpenMenu} className="-ml-2 lg:hidden">
        <Menu className="size-5" aria-hidden="true" />
      </IconButton>
      <Link href={ROLE_HOME[role]} className="rounded-sm lg:hidden">
        <Logo className="h-6" />
      </Link>

      <SearchBox role={role} />

      <div className="ml-auto flex items-center gap-1">
        <IconButton asChild variant="tertiary" label="Help and support">
          <Link href={helpItem(role).href}>
            <CircleQuestionMark className="size-5" aria-hidden="true" />
          </Link>
        </IconButton>
        <Notifications />
        <span className="mx-2 hidden h-8 w-px bg-grey-200 sm:block" aria-hidden="true" />
        <UserMenu role={role} />
      </div>
    </header>
  );
}

function SearchBox({ role }: { role: Role }) {
  const router = useRouter();
  const { placeholder, href } = SEARCH[role];

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    router.push(query ? `${href}?q=${encodeURIComponent(query)}` : href);
  }

  return (
    <form role="search" onSubmit={onSubmit} className="relative hidden w-full max-w-100 md:block">
      <label htmlFor="global-search" className="sr-only">
        Search
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-600"
        aria-hidden="true"
      />
      <Input id="global-search" name="q" type="search" size="md" placeholder={placeholder} className="pl-12 text-body-sm" />
    </form>
  );
}

function Notifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton variant="tertiary" label="Notifications">
          <Bell className="size-5" aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <p className="text-h3 text-grey-900">Notifications</p>
        <p className="mt-1 text-body-sm text-grey-600">
          No notifications yet. Updates about your parcels will show up here.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ role }: { role: Role }) {
  const { state, logout, loggingOut } = useCurrentUserState();
  const settings = settingsHref(role);

  if (state.status !== "ready") {
    return (
      <div className="flex items-center gap-3" aria-hidden="true">
        <Skeleton className="size-10 rounded-full" />
        <div className="hidden flex-col gap-1 sm:flex">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const { user } = state;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.fullName}`}
        className="flex items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-grey-50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-grey-200 bg-grey-50 text-label font-semibold text-grey-800">
          {initials(user.fullName)}
        </span>
        <span className="hidden flex-col sm:flex">
          <span className="max-w-40 truncate text-label text-grey-900">{user.fullName}</span>
          <span className="text-caption font-normal text-grey-600">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="hidden size-5 text-grey-600 sm:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block text-label text-grey-900">{user.fullName}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {settings ? (
          <DropdownMenuItem asChild>
            <Link href={settings}>
              <SlidersHorizontal aria-hidden="true" />
              {role === "ADMIN" ? "Account settings" : "Settings"}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={loggingOut}
          onSelect={() => {
            void logout();
          }}
        >
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

