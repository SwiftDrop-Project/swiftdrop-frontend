"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useCurrentUserState } from "@/features/identity";
import { activeHref, helpItem, NAVIGATION } from "@/lib/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const itemClass = "flex h-10 w-full items-center gap-3 rounded-md px-3 text-body transition-colors";

/** Sidebar content, used both in the fixed desktop sidebar and in the mobile drawer. */
export function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeHref(role, pathname);
  const help = helpItem(role);
  const { logout, loggingOut } = useCurrentUserState();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-topbar shrink-0 items-center border-b border-grey-200 px-6">
        <Link href={ROLE_HOME[role]} onClick={onNavigate} className="rounded-sm">
          <Logo className="h-7" />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {NAVIGATION[role].map((group, index) => (
          <div key={group.label ?? index} className={cn(index > 0 && "mt-6")}>
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
        ))}
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
      {title}
    </Link>
  );
}
