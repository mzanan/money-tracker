"use client";

import { ChatComposer } from "@/components/assistant/chatComposer";
import { MessageList } from "@/components/assistant/messageList";
import { useAssistant } from "@/components/assistant/useAssistant";
import { ErrorText } from "@/components/ui/errorText";

const BUDGET_SUGGESTIONS = [
  "Where is my money going this month?",
  "How can I cut spending?",
  "What are my fixed monthly costs?",
  "Compare my last 6 months of spending",
];

export function BudgetPanel() {
  const { messages, input, setInput, submit, ask, busy, error } =
    useAssistant();

  return (
    <div className="flex h-[60vh] max-h-[32rem] flex-col">
      <MessageList
        messages={messages}
        onSuggest={ask}
        suggestions={BUDGET_SUGGESTIONS}
        emptyHint="Analyze your spending with real data: fixed vs variable, categories, merchants and trend."
      />
      {error && (
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
    </div>
  );
}
