"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ASSISTANT_ENABLED } from "@/lib/featureFlags";

import { AssistantWidget } from "@/components/assistant/assistantWidget";
import { Button } from "@/components/ui/button";

import { BaseCurrencyPicker } from "./baseCurrencyPicker";
import { Brand } from "./brand";
import { NAV_ITEMS } from "./navItems";
import { ThemeToggle } from "./themeToggle";
import { useSignOut } from "./useSignOut";

const DASHBOARD_ITEM = NAV_ITEMS.find((item) => item.href === "/dashboard")!;
const SETTINGS_ITEM = NAV_ITEMS.find((item) => item.href === "/settings")!;

export function Header() {
  const pathname = usePathname();
  const handleSignOut = useSignOut();

  return (
    <header className="bg-background/80 h-header sticky top-0 z-10 flex items-center justify-between gap-2 px-4 backdrop-blur">
      <Brand />
      <div className="flex items-center gap-0.5">
        <BaseCurrencyPicker />
        {ASSISTANT_ENABLED && <AssistantWidget />}
        <ThemeToggle />
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={DASHBOARD_ITEM.label}
          className={cn(
            "hidden lg:inline-flex",
            pathname === DASHBOARD_ITEM.href && "text-foreground",
          )}
        >
          <Link
            href={DASHBOARD_ITEM.href}
            aria-current={pathname === DASHBOARD_ITEM.href ? "page" : undefined}
          >
            <DASHBOARD_ITEM.icon />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={SETTINGS_ITEM.label}
          className={cn(pathname === SETTINGS_ITEM.href && "text-foreground")}
        >
          <Link
            href={SETTINGS_ITEM.href}
            aria-current={pathname === SETTINGS_ITEM.href ? "page" : undefined}
          >
            <SETTINGS_ITEM.icon />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOutIcon />
        </Button>
      </div>
    </header>
  );
}
