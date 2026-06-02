"use client";

import type { UIMessage } from "ai";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ChatComposer } from "./chatComposer";
import { MessageList } from "./messageList";

export function ChatPanel({
  messages,
  input,
  setInput,
  submit,
  ask,
  busy,
  hasError,
  onClose,
}: {
  messages: UIMessage[];
  input: string;
  setInput: (value: string) => void;
  submit: () => void;
  ask: (text: string) => void;
  busy: boolean;
  hasError: boolean;
  onClose: () => void;
}) {
  return (
    <div className="bg-background/95 fixed inset-x-3 bottom-3 z-50 flex h-[70vh] max-h-[34rem] flex-col overflow-hidden rounded-2xl border border-border shadow-xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Asistente</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </header>

      <MessageList messages={messages} onSuggest={ask} />

      {hasError && (
        <p className="text-destructive px-3 pb-1 text-xs">
          No pude responder. Probá de nuevo en un momento.
        </p>
      )}

      <ChatComposer
        input={input}
        setInput={setInput}
        onSubmit={submit}
        busy={busy}
      />
    </div>
  );
}
