import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";

export function LandingFooter() {
  return (
    <footer className="border-border border-t py-10">
      <LandingContainer className="flex justify-center">
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-eyebrow text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {landingCopy.footer.privacy}
          </Link>
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
        </div>
      </LandingContainer>
    </footer>
  );
}
