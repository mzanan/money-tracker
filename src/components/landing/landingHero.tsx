import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { enterUpClasses, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";
import { LandingPreview } from "./landingPreview";
import { LandingShowcase } from "./landingShowcase";

const SUBTITLE_STEP = landingCopy.hero.title.length;
const PREVIEW_STEP = SUBTITLE_STEP + 1;
const SHOWCASE_STEP = PREVIEW_STEP + 2;
const CTA_STEP = SHOWCASE_STEP + landingCopy.showcase.length;

export function LandingHero() {
  return (
    <section className="bg-glow pt-20 pb-20 sm:pt-28 sm:pb-28">
      <LandingContainer className="flex flex-col items-center gap-8 text-center">
        <Heading as="h1" size="display" className="sm:text-6xl">
          {landingCopy.hero.title.map((line, index) => (
            <span
              key={line}
              style={staggerDelay(index)}
              className={cn("block", enterUpClasses)}
            >
              {line}
            </span>
          ))}
        </Heading>
        <p
          style={staggerDelay(SUBTITLE_STEP)}
          className={cn(
            "text-muted-foreground text-lg text-balance sm:text-xl lg:text-nowrap",
            enterUpClasses,
          )}
        >
          {landingCopy.hero.subtitle}
        </p>
        <div className="mt-4 flex w-full flex-col gap-4 sm:mt-8">
          <LandingPreview firstStep={PREVIEW_STEP} />
          <LandingShowcase firstStep={SHOWCASE_STEP} />
        </div>
        <Button
          asChild
          size="xl"
          style={staggerDelay(CTA_STEP)}
          className={cn("shadow-primary/30 mt-4 shadow-lg", enterUpClasses)}
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
