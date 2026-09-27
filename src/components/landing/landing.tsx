import { LandingFooter } from "./landingFooter";
import { LandingHeader } from "./landingHeader";
import { LandingHero } from "./landingHero";

export function Landing() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
      </main>
      <LandingFooter />
    </div>
  );
}
