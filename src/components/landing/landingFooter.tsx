import { ArrowUpRight } from "lucide-react";

import landingCopy from "./landing.json";
import { LandingBrand } from "./landingBrand";
import { LandingContainer } from "./landingContainer";

export function LandingFooter() {
  return (
    <footer className="border-border border-t py-10">
      <LandingContainer className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <LandingBrand />
        <a
          href={landingCopy.footer.authorHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-eyebrow group text-foreground hover:text-primary inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          {landingCopy.footer.builtBy}
          <ArrowUpRight
            size={12}
            strokeWidth={1.75}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </LandingContainer>
    </footer>
  );
}
