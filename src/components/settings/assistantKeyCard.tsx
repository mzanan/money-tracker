import { getAssistantSettings } from "@/lib/data/userSettings";
import { getUser } from "@/lib/session";

import { AssistantKeyPanel } from "./assistantKeyPanel";

export async function AssistantKeyCard() {
  const user = await getUser();
  if (!user) return null;

  const row = await getAssistantSettings(user.id);

  return (
    <AssistantKeyPanel
      initialProvider={row?.ai_provider ?? null}
      initialModel={row?.ai_model ?? null}
      hasKey={Boolean(row?.ai_api_key)}
    />
  );
}
