import { LandingHero } from "./landingHero";
import { LandingShell } from "./landingShell";

export function Landing() {
  return (
    <LandingShell>
      <LandingHero />
    </LandingShell>
  );
}
