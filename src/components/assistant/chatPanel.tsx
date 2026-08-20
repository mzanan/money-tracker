"use client";

import type { UIMessage } from "ai";
import { XIcon } from "lucide-react";

import { ApiKeyRequiredNotice } from "@/components/ui/apiKeyRequiredNotice";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/errorText";

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
  hasApiKey,
  onClose,
}: {
  messages: UIMessage[];
  input: string;
  setInput: (value: string) => void;
  submit: () => void;
  ask: (text: string) => void;
  busy: boolean;
  hasError: boolean;
  hasApiKey: boolean;
  onClose: () => void;
}) {
  return (
    <div className="bg-background fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:bg-background/95 sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[70vh] sm:max-h-[34rem] sm:w-96 sm:rounded-2xl sm:border sm:border-border sm:p-0 sm:shadow-xl sm:backdrop-blur">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Assistant</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </header>

      {hasApiKey ? (
        <>
          <MessageList messages={messages} onSuggest={ask} />

          {hasError && (
            <ErrorText className="px-3 pb-1">
              Could not respond. Try again in a moment.
            </ErrorText>
          )}

          <ChatComposer
            input={input}
            setInput={setInput}
            onSubmit={submit}
            busy={busy}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <ApiKeyRequiredNotice feature="The assistant" />
        </div>
      )}
    </div>
  );
}
