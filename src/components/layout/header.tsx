"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, SettingsIcon } from "lucide-react";

import { authClient } from "@/lib/authClient";
import { ASSISTANT_ENABLED } from "@/lib/featureFlags";

import { AssistantWidget } from "@/components/assistant/assistantWidget";
import { Button } from "@/components/ui/button";

import { BaseCurrencyPicker } from "./baseCurrencyPicker";
import { Brand } from "./brand";
import { ThemeToggle } from "./themeToggle";

export function Header() {
  const router = useRouter();

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
