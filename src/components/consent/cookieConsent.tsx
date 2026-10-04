"use client";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";

export function CookieConsent() {
  const { status, accept, decline } = useAnalyticsConsent();

  return (
    <Reveal
      open={status === "pending"}
      variant="bottom"
      className="bottom-consent fixed inset-x-3 z-40 lg:right-4 lg:left-auto lg:max-w-sm"
    >
      <Surface
        role="region"
        aria-label="Cookie consent"
        radius="lg"
        padding="sm"
        className="flex flex-col gap-3 border shadow-lg"
      >
        <p className="text-muted-foreground text-sm">
          We use first-party cookies for analytics and text-masked session
          replay, never ads. Decline and we only count visits anonymously.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="xl" onClick={decline}>
            Decline
          </Button>
          <Button variant="outline" size="xl" onClick={accept}>
            Accept
          </Button>
        </div>
      </Surface>
    </Reveal>
  );
}
