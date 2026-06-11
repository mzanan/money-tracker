"use client";

import { ChatComposer } from "@/components/assistant/chatComposer";
import { MessageList } from "@/components/assistant/messageList";
import { useAssistant } from "@/components/assistant/useAssistant";

const BUDGET_SUGGESTIONS = [
  "¿En qué se me está yendo la plata este mes?",
  "¿Cómo puedo recortar gastos?",
  "¿Cuáles son mis gastos fijos mensuales?",
  "Compará mis últimos 6 meses de gasto",
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
        emptyHint="Analizá tu gasto con datos reales: fijos vs variables, rubros, comercios y tendencia."
      />
      {error && (
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
