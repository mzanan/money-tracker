"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { saveIntegration } from "@/lib/actions/integrations";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

export function useIntegrationDialog({
  provider,
  label,
  integration,
  open,
  onOpenChange,
}: {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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

  return {
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
  };
}
