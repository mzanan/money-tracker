"use client";

import { SparklesIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

import { ChatPanel } from "./chatPanel";
import { useAssistant } from "./useAssistant";

export function AssistantWidget() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const { messages, input, setInput, submit, ask, busy, status } =
    useAssistant();

  if (open) {
    return (
      <ChatPanel
        messages={messages}
        input={input}
        setInput={setInput}
        submit={submit}
        ask={ask}
        busy={busy}
        hasError={status === "error"}
        hasApiKey={settings.hasAiKey}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Open assistant"
      onClick={() => setOpen(true)}
    >
      <SparklesIcon />
    </Button>
  );
}
