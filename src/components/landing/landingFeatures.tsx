import landingCopy from "./landing.json";
import { LandingContainer } from "./landingContainer";

export function LandingFeatures() {
  return (
    <section id="features" className="border-border border-t py-16 sm:py-24">
      <LandingContainer>
        <div className="divide-border grid gap-12 sm:grid-cols-3 sm:gap-0 sm:divide-x">
          {landingCopy.features.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col gap-3 sm:px-8 sm:first:pl-0 sm:last:pr-0"
            >
              <h2 className="text-xl font-semibold tracking-tight">
                {feature.title}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
