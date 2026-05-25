"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="block size-4 dark:hidden" />
    </Button>
  );
}
