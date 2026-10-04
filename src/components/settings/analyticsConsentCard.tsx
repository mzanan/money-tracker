"use client";

import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function AnalyticsConsentCard() {
  const { status, accept, decline } = useAnalyticsConsent();

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Analytics cookies</p>
          <p className="text-muted-foreground text-xs">
            Usage analytics and text-masked session replay. Off means visits
            are only counted anonymously.
          </p>
        </div>
        <Switch
          checked={status === "granted"}
          disabled={status === null}
          onCheckedChange={(checked) => (checked ? accept() : decline())}
          aria-label="Analytics cookies"
        />
      </CardContent>
    </Card>
  );
}
