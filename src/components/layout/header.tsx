"use client";

import { LogOutIcon } from "lucide-react";

import { ASSISTANT_ENABLED } from "@/lib/featureFlags";

import { AssistantWidget } from "@/components/assistant/assistantWidget";
import { Button } from "@/components/ui/button";

import { BaseCurrencyPicker } from "./baseCurrencyPicker";
import { Brand } from "./brand";
import { NavIconLink } from "./navIconLink";
import { NAV_ITEMS } from "./navItems";
import { ThemeToggle } from "./themeToggle";
import { useSignOut } from "./useSignOut";

const DASHBOARD_ITEM = NAV_ITEMS.find((item) => item.href === "/dashboard")!;
const SETTINGS_ITEM = NAV_ITEMS.find((item) => item.href === "/settings")!;

export function Header() {
  const handleSignOut = useSignOut();

  return (
    <header className="bg-background/80 h-header sticky top-0 z-10 flex items-center justify-between gap-2 px-4 backdrop-blur">
      <Brand />
      <div className="flex items-center gap-0.5">
        <BaseCurrencyPicker />
        {ASSISTANT_ENABLED && <AssistantWidget />}
        <ThemeToggle />
        <NavIconLink item={DASHBOARD_ITEM} className="hidden lg:inline-flex" />
        <NavIconLink item={SETTINGS_ITEM} />
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
