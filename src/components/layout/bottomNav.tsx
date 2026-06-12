"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPieIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/#quick-add", label: "Add", icon: PlusIcon, accent: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="bg-background/90 border-border fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon, ...item }) => {
          const accent = "accent" in item && item.accent;
          const active =
            !accent && pathname === (href === "/#quick-add" ? "/" : href);
          return (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {accent ? (
                <span className="bg-primary text-primary-foreground -mt-4 flex size-11 items-center justify-center rounded-full shadow-md">
                  <Icon className="size-5" />
                </span>
              ) : (
                <>
                  <Icon className="size-5" />
                  {label}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
