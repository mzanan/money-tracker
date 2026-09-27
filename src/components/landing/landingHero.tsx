import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { enterUpClasses } from "@/lib/motion";
import { cn } from "@/lib/utils";

import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";
import { LandingPreview } from "./landingPreview";
import { LandingShowcase } from "./landingShowcase";

export function LandingHero() {
  return (
    <section id="top" className="bg-glow pt-20 pb-20 sm:pt-28 sm:pb-28">
      <LandingContainer className="flex flex-col items-center gap-8 text-center">
        <Heading
          as="h1"
          size="display"
          className={cn("max-w-4xl", enterUpClasses)}
        >
          {landingCopy.hero.title}
        </Heading>
        <p
          className={cn(
            "text-muted-foreground max-w-2xl text-lg text-balance delay-100 sm:text-xl",
            enterUpClasses,
          )}
        >
          {landingCopy.hero.subtitle}
        </p>
        <div
          className={cn(
            "mt-4 flex w-full flex-col gap-4 delay-200 sm:mt-8",
            enterUpClasses,
          )}
        >
          <LandingPreview />
          <LandingShowcase />
        </div>
        <Button
          asChild
          size="xl"
          className={cn(
            "shadow-primary/30 mt-4 shadow-lg delay-300",
            enterUpClasses,
          )}
        >
          <Link href="/login">
            {landingCopy.hero.cta}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </LandingContainer>
    </section>
  );
}
