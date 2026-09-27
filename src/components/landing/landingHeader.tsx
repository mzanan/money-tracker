import Link from "next/link";

import { ThemeToggle } from "@/components/layout/themeToggle";
import { Button } from "@/components/ui/button";

import landingCopy from "./landing.json";
import { LandingBrand } from "./landingBrand";
import { LandingContainer } from "./landingContainer";

export function LandingHeader({ showCta }: { showCta: boolean }) {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-10 border-b backdrop-blur">
      <LandingContainer className="h-header flex items-center justify-between gap-6">
        <LandingBrand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {showCta && (
            <Button asChild size="sm">
              <Link href="/login">{landingCopy.nav.cta}</Link>
            </Button>
          )}
        </div>
      </LandingContainer>
    </header>
  );
}
