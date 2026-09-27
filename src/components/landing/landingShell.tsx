import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { LandingFooter } from "./landingFooter";
import { LandingHeader } from "./landingHeader";

export function LandingShell({
  showCta = true,
  mainClassName,
  children,
}: {
  showCta?: boolean;
  mainClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <LandingHeader showCta={showCta} />
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      <LandingFooter />
    </div>
  );
}
