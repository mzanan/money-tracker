"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { saveIntegration } from "@/lib/actions/integrations";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const LOOKBACK_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last 12 months" },
  { value: "730", label: "Last 2 years" },
] as const;

interface Props {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationDialog({
  provider,
  label,
  integration,
  open,
  onOpenChange,
}: Props) {
  const isFirstConnect = !integration;
  // Credentials are never sent to the client. The form starts empty; on edit a
  // blank field keeps the stored value.
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [importIncome, setImportIncome] = useState(
    integration?.importIncome ?? false,
  );
  const [lookbackDays, setLookbackDays] = useState("30");
  const { run, pending } = useServerAction();

  function handleOpenChange(next: boolean) {
    if (next && !open) {
      setApiKey("");
      setApiSecret("");
      setImportIncome(integration?.importIncome ?? false);
      setLookbackDays("30");
    }
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run(
      () =>
        saveIntegration({
          provider,
          apiKey,
          apiSecret,
          importIncome,
          initialSinceDays: isFirstConnect ? Number(lookbackDays) : undefined,
        }),
      {
        success: `${label} ${integration ? "updated" : "connected"}`,
        onSuccess: () => handleOpenChange(false),
      },
    );
  }

  const helpText =
    "Create a read-only API key at bybit.com → API Management with permissions for Wallet (read-only).";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {integration ? `Edit ${label} credentials` : `Connect ${label}`}
          </DialogTitle>
          <DialogDescription>{helpText}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              required={isFirstConnect}
              placeholder={isFirstConnect ? undefined : "Leave blank to keep current"}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="api-secret">API secret</Label>
            <Input
              id="api-secret"
              type="password"
              value={apiSecret}
              onChange={(event) => setApiSecret(event.target.value)}
              required={isFirstConnect}
              placeholder={isFirstConnect ? undefined : "Leave blank to keep current"}
              autoComplete="off"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Import incoming as income</p>
              <p className="text-muted-foreground text-xs">
                Only enable if this is where you receive your salary or payments.
              </p>
            </div>
            <Switch
              checked={importIncome}
              onCheckedChange={setImportIncome}
            />
          </div>

          {isFirstConnect && (
            <div className="grid gap-1.5">
              <Label htmlFor="lookback">Initial sync window</Label>
              <Select value={lookbackDays} onValueChange={setLookbackDays}>
                <SelectTrigger id="lookback">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKBACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                One-time choice. After the first sync, future syncs are
                incremental. Longer windows fetch more history but use more
                API calls (≈1 request per 6 days).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || (isFirstConnect && !apiKey.trim())}
            >
              {pending && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
