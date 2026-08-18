"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { saveIntegration } from "@/lib/actions/integrations";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

export function useIntegrationDialog({
  provider,
  label,
  integration,
  onOpenChange,
}: {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isFirstConnect = !integration;
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [importIncome, setImportIncome] = useState(
    integration?.importIncome ?? false,
  );
  const [lookbackDays, setLookbackDays] = useState("30");
  const { run, pending } = useServerAction();

  function handleSubmit() {
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
        onSuccess: () => onOpenChange(false),
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
    handleSubmit,
  };
}
