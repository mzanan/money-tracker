"use client";

import { useState } from "react";

import { AI_PROVIDERS, type AiProvider } from "@/config/aiProviders";
import { useServerAction } from "@/hooks/useServerAction";
import { removeAssistantKey, saveAssistantKey } from "@/lib/actions/settings";

interface Options {
  initialProvider: AiProvider | null;
  initialModel: string | null;
}

export function useAssistantKeyForm({
  initialProvider,
  initialModel,
}: Options) {
  const [provider, setProvider] = useState<AiProvider>(
    initialProvider ?? "google",
  );
  const [model, setModel] = useState(initialModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const { run, pending } = useServerAction();

  const defaultModel = AI_PROVIDERS[provider].defaultModel;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run(() => saveAssistantKey({ provider, model, apiKey }), {
      success: "API key saved",
      onSuccess: () => setApiKey(""),
    });
  }

  function handleRemove() {
    run(() => removeAssistantKey(), {
      success: "API key removed",
      confirm:
        "Remove your API key? The assistant will fall back to the app's default model.",
      onSuccess: () => {
        setProvider("google");
        setModel("");
        setApiKey("");
      },
    });
  }

  return {
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    defaultModel,
    pending,
    handleSubmit,
    handleRemove,
  };
}
