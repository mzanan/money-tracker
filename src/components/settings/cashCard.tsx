"use client";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setCashEnabled } from "@/lib/actions/settings";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function CashCard() {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Enable cash account</p>
          <p className="text-muted-foreground text-xs">
            Adds a &ldquo;Cash&rdquo; tab on the home to log income and expenses by
          hand.
          </p>
        </div>
        <Switch
          checked={settings.cash_enabled}
          disabled={pending}
          onCheckedChange={(checked) => run(() => setCashEnabled(checked))}
          aria-label="Enable cash account"
        />
      </CardContent>
    </Card>
  );
}
