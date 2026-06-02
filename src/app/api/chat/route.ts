import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";

import { buildAssistantTools } from "@/lib/ai/assistantTools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { chatModel } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { todayInTz } from "@/lib/dates";
import { getUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "The assistant is not configured yet." },
      { status: 503 },
    );
  }

  const settings = await db
    .select({
      base_currency: user_settings.base_currency,
      timezone: user_settings.timezone,
    })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!settings) {
    return Response.json({ error: "Settings not found" }, { status: 400 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const timezone = settings.timezone ?? "UTC";

  const result = streamText({
    model: chatModel,
    system: buildSystemPrompt({
      baseCurrency: settings.base_currency,
      today: todayInTz(timezone),
      timezone,
    }),
    messages: await convertToModelMessages(messages),
    tools: buildAssistantTools({
      userId: user.id,
      baseCurrency: settings.base_currency,
    }),
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
