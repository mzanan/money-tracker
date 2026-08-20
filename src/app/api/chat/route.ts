import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";

import { buildAssistantTools } from "@/lib/ai/assistantTools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { resolveChatModel } from "@/lib/ai/provider";
import {
  countryFromHeaders,
  logUsageEvent,
} from "@/lib/data/usageEvents";
import { getAssistantSettings } from "@/lib/data/userSettings";
import { todayInTz } from "@/lib/dates";
import { ASSISTANT_ENABLED, BUDGET_ENABLED } from "@/lib/featureFlags";
import { decryptSecret } from "@/lib/integrations/crypto";
import { getUser } from "@/lib/session";

export async function POST(req: Request) {
  if (!ASSISTANT_ENABLED && !BUDGET_ENABLED) {
    return Response.json({ error: "Assistant is disabled" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = await getAssistantSettings(user.id);

  if (!settings) {
    return Response.json({ error: "Settings not found" }, { status: 400 });
  }

  if (!settings.ai_api_key || !settings.ai_provider) {
    return Response.json({ error: "byok_required" }, { status: 403 });
  }

  let userApiKey: string;
  try {
    userApiKey = decryptSecret(settings.ai_api_key, `${user.id}:ai`);
  } catch {
    return Response.json(
      { error: "Your API key could not be read. Re-enter it in Settings." },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const timezone = settings.timezone ?? "UTC";

  await logUsageEvent({
    userId: user.id,
    event: "chat_message",
    detail: settings.ai_provider,
    country: countryFromHeaders(req.headers),
  });

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
