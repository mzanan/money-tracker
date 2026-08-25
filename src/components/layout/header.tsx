"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOutIcon, SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { ASSISTANT_ENABLED } from "@/lib/featureFlags";

import { AssistantWidget } from "@/components/assistant/assistantWidget";
import { Button } from "@/components/ui/button";

import { BaseCurrencyPicker } from "./baseCurrencyPicker";
import { Brand } from "./brand";
import { NAV_ITEMS } from "./navItems";
import { ThemeToggle } from "./themeToggle";

const DASHBOARD_ITEM = NAV_ITEMS.find((item) => item.href === "/dashboard")!;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 backdrop-blur">
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
          <Link href={DASHBOARD_ITEM.href}>
            <DASHBOARD_ITEM.icon />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Settings">
          <Link href="/settings">
            <SettingsIcon />
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
