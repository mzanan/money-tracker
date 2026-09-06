import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";

export function LandingHeader() {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-10 border-b backdrop-blur">
      <LandingContainer className="flex h-14 items-center justify-between gap-6">
        <Brand href="#top" showBeta={false} />
        <Button asChild size="sm">
          <Link href="/login">{landingCopy.nav.cta}</Link>
        </Button>
      </LandingContainer>
    </header>
  );
}
