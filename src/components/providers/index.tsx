"use client";

import { Toaster } from "@/components/ui/sonner";

import { QueryProvider } from "./queryProvider";
import { ThemeProvider } from "./themeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>{children}</QueryProvider>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}
