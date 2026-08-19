import type { UIMessage } from "ai";

import { isToolPart, messageText } from "@/lib/ai/message";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = messageText(message);
  const working =
    !isUser && !text && message.parts.some((part) => isToolPart(part.type));

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {working ? (
          <span className="text-muted-foreground">Checking your data…</span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
