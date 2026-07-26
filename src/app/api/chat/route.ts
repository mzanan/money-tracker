import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";

import { buildAssistantTools } from "@/lib/ai/assistantTools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { hasServerKey, resolveChatModel } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { todayInTz } from "@/lib/dates";
import { decryptSecret } from "@/lib/integrations/crypto";
import { getUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = await db
    .select({
      base_currency: user_settings.base_currency,
      timezone: user_settings.timezone,
      ai_provider: user_settings.ai_provider,
      ai_model: user_settings.ai_model,
      ai_api_key: user_settings.ai_api_key,
    })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!settings) {
    return Response.json({ error: "Settings not found" }, { status: 400 });
  }

  let userApiKey: string | null = null;
  if (settings.ai_api_key) {
    try {
      userApiKey = decryptSecret(settings.ai_api_key, `${user.id}:ai`);
    } catch {
      return Response.json(
        { error: "Your API key could not be read. Re-enter it in Settings." },
        { status: 503 },
      );
    }
  }

  if (!userApiKey && !hasServerKey()) {
    return Response.json(
      {
        error:
          "The assistant is not configured. Add your own API key in Settings.",
      },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const timezone = settings.timezone ?? "UTC";

  const result = streamText({
    model: resolveChatModel({
      provider: settings.ai_provider,
      model: settings.ai_model,
      apiKey: userApiKey,
    }),
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
