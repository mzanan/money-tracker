"use client";

import { Loader2Icon } from "lucide-react";

import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

import { useIntegrationDialog } from "./useIntegrationDialog";

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
  const {
    isFirstConnect,
    apiKey,
    setApiKey,
    apiSecret,
    setApiSecret,
    importIncome,
    setImportIncome,
    lookbackDays,
    setLookbackDays,
    pending,
    handleOpenChange,
    handleSubmit,
  } = useIntegrationDialog({
    provider,
    label,
    integration,
    open,
    onOpenChange,
  });

  const helpText =
    "Create a read-only API key at bybit.com → API Management with permissions for Wallet (read-only).";

  return (
    <Drawer size="sm" open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <DrawerTitle>
            {integration ? `Edit ${label} credentials` : `Connect ${label}`}
          </DrawerTitle>
          <DrawerDescription>{helpText}</DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
          <div className="grid gap-1.5">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              required={isFirstConnect}
              placeholder={
                isFirstConnect ? undefined : "Leave blank to keep current"
              }
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
              placeholder={
                isFirstConnect ? undefined : "Leave blank to keep current"
              }
              autoComplete="off"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Import incoming as income</p>
              <p className="text-muted-foreground text-xs">
                Only enable if this is where you receive your salary or
                payments.
              </p>
            </div>
            <Switch checked={importIncome} onCheckedChange={setImportIncome} />
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
                incremental. Longer windows fetch more history but use more API
                calls (≈1 request per 6 days).
              </p>
            </div>
          )}
        </DrawerBody>

        <DrawerFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            className="sm:flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            className="sm:flex-1"
            onClick={handleSubmit}
            disabled={pending || (isFirstConnect && !apiKey.trim())}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
