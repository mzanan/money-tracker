"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { MessageBubble } from "./messageBubble";

const DEFAULT_SUGGESTIONS = [
  "What's my balance?",
  "How much did I spend this month?",
  "Which category do I spend most on?",
  "Show my daily spend for the last week",
];

export function MessageList({
  messages,
  onSuggest,
  suggestions = DEFAULT_SUGGESTIONS,
  emptyHint = "Ask me about your finances.",
}: {
  messages: UIMessage[];
  onSuggest: (text: string) => void;
  suggestions?: string[];
  emptyHint?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-end gap-2 p-3">
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((text) => (
            <Button
              key={text}
              variant="outline"
              size="sm"
              className="h-auto justify-start py-1.5 text-left whitespace-normal"
              onClick={() => onSuggest(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
