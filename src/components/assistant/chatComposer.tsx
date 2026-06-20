"use client";

import { ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({
  input,
  setInput,
  onSubmit,
  busy,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <form
      className="flex items-end gap-2 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Textarea
        value={input}
        autoFocus
        rows={1}
        placeholder="Ask a question…"
        className="max-h-32 min-h-9 flex-1 resize-none"
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={busy || !input.trim()}
        aria-label="Send"
      >
        <ArrowUpIcon />
      </Button>
    </form>
  );
}
