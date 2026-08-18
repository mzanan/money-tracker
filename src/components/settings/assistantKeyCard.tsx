import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import { AssistantKeyPanel } from "./assistantKeyPanel";

export async function AssistantKeyCard() {
  const user = await getUser();
  if (!user) return null;

  const row = await db
    .select({
      provider: user_settings.ai_provider,
      model: user_settings.ai_model,
      apiKey: user_settings.ai_api_key,
    })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  return (
    <AssistantKeyPanel
      initialProvider={row?.provider ?? null}
      initialModel={row?.model ?? null}
      hasKey={Boolean(row?.apiKey)}
    />
  );
}
