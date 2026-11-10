"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LoaderCircle, LogOut, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Logo } from "@/components/ui/logo";
import { useCurrentUserState } from "@/features/identity";
import { activeHref, helpItem, NAVIGATION, type NavGroup } from "@/lib/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const itemClass = "flex h-10 w-full items-center gap-3 rounded-md px-3 text-body transition-colors";

function buildInitialOpenState(groups: NavGroup[], active: string | undefined): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  groups.forEach((group, index) => {
    if (!group.collapsible) return;
    const key = group.label ?? String(index);
    const containsActive = group.items.some((item) => item.href === active);
    initial[key] = containsActive || Boolean(group.defaultOpen);
  });
  return initial;
}

/** Sidebar content, used both in the fixed desktop sidebar and in the mobile drawer. */
export function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeHref(role, pathname);
  const help = helpItem(role);
  const { logout, loggingOut } = useCurrentUserState();
  const groups = NAVIGATION[role];
  const baseId = React.useId();

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() =>
    buildInitialOpenState(groups, active),
  );
  const [lastActive, setLastActive] = React.useState<string | undefined>(active);

  // Ensure the group containing the active route expands when navigating to a new route.
  if (active !== lastActive) {
    setLastActive(active);
    if (active) {
      const groupWithActive = groups.find(
        (group) => group.collapsible && group.items.some((item) => item.href === active),
      );
      if (groupWithActive?.label && !openGroups[groupWithActive.label]) {
        setOpenGroups((current) => ({ ...current, [groupWithActive.label as string]: true }));
      }
    }
  }

  function toggleGroup(key: string) {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-topbar shrink-0 items-center border-b border-grey-200 px-6">
        <Link
          href={ROLE_HOME[role]}
          onClick={onNavigate}
          className="flex flex-col items-start gap-0.5 rounded-sm"
        >
          <Logo className={role === "ADMIN" ? "h-5" : "h-7"} />
          {role === "ADMIN" ? (
            <span className="text-caption font-medium text-grey-600">SwiftDrop Dashboard</span>
          ) : null}
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => {
          const key = group.label ?? String(index);

          if (group.collapsible && group.label) {
            const isOpen = openGroups[key] ?? Boolean(group.defaultOpen);
            const panelId = `${baseId}-group-${index}`;
            const hasActiveChild = group.items.some((item) => item.href === active);

            return (
              <div key={key} className={cn(index > 0 && "mt-3")}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleGroup(key)}
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md px-3 text-caption font-semibold tracking-wider uppercase transition-colors",
                    hasActiveChild && !isOpen
                      ? "bg-orange-50 text-orange-800"
                      : "text-grey-600 hover:bg-grey-50 hover:text-grey-900",
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-grey-500 transition-transform duration-150",
                      !isOpen && "-rotate-90",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <ul id={panelId} className="mt-1 flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          href={item.href}
                          title={item.title}
                          icon={item.icon}
                          active={item.href === active}
                          onNavigate={onNavigate}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          }

          return (
            <div key={key} className={cn(index > 0 && "mt-6")}>
              {group.label ? (
                <p className="px-3 pb-2 text-caption tracking-wider text-grey-500 uppercase">{group.label}</p>
              ) : null}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      active={item.href === active}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <ul className="flex shrink-0 flex-col gap-1 border-t border-grey-200 px-3 py-4">
        <li>
          <NavLink
            href={help.href}
            title={help.title}
            icon={help.icon}
            active={help.href === active}
            onNavigate={onNavigate}
          />
        </li>
        <li>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-busy={loggingOut || undefined}
            className={cn(itemClass, "text-grey-700 hover:bg-grey-50 hover:text-grey-900 disabled:text-grey-400")}
          >
            {loggingOut ? (
              <LoaderCircle className="size-5 animate-spin text-grey-600" aria-hidden="true" />
            ) : (
              <LogOut className="size-5 text-grey-600" aria-hidden="true" />
            )}
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}

function NavLink({
  href,
  title,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClass,
        active
          ? "bg-orange-50 font-semibold text-orange-800"
          : "text-grey-700 hover:bg-grey-50 hover:text-grey-900",
      )}
    >
      <Icon className={cn("size-5 shrink-0", active ? "text-orange-600" : "text-grey-600")} aria-hidden="true" />
      <span className="truncate">{title}</span>
    </Link>
  );
}
