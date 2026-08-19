import type { UIMessage } from "ai";

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("")
    .trim();
}

export function isToolPart(type: string): boolean {
  return type.startsWith("tool-") || type === "dynamic-tool";
}
