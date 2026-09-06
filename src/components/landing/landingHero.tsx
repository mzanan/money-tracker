import Link from "next/link";

import { Button } from "@/components/ui/button";

import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";

export function LandingHero() {
  return (
    <section id="top" className="pt-20 pb-20 sm:pt-28 sm:pb-24">
      <LandingContainer className="flex flex-col items-center gap-8 text-center">
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          {landingCopy.hero.title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance sm:text-xl">
          {landingCopy.hero.subtitle}
        </p>
        <Button asChild size="xl">
          <Link href="/login">{landingCopy.hero.cta}</Link>
        </Button>
        <ul className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          {landingCopy.hero.badges.map((badge) => (
            <li key={badge}>{badge}</li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}
