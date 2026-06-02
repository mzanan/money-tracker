import { google } from "@ai-sdk/google";

export const chatModel = google(
  process.env.AI_CHAT_MODEL ?? "gemini-2.5-flash",
);
