"use server";

import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actionError";
import { getSelectableSources } from "@/lib/data/sources";
import {
  getArchivedSources,
  setSourceArchivedFlag,
  updateAssistantKey,
  updateDefaultSource,
  updateFixedLabels,
  updateGeneralSettings,
  upsertOnboardedSettings,
} from "@/lib/data/userSettings";
import { normalizeFixedLabel } from "@/lib/fixedExpenses";
import { encryptSecret } from "@/lib/integrations/crypto";
import {
  assistantKeySchema,
  onboardingSchema,
  updateSettingsSchema,
  type AssistantKeyInput,
  type OnboardingInput,
  type UpdateSettingsInput,
} from "@/lib/schemas/settings";
import { getUser } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveOnboarding(
  input: OnboardingInput,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const timezone = parsed.data.timezone?.trim() || null;
  const onboardedAt = new Date().toISOString();

  try {
    await upsertOnboardedSettings(user.id, {
      currencies: parsed.data.currencies,
      base_currency: parsed.data.baseCurrency,
      timezone,
      onboarded_at: onboardedAt,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function setDefaultSource(source: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (source !== "all") {
    const [sources, archivedRow] = await Promise.all([
      getSelectableSources(user.id),
      getArchivedSources(user.id),
    ]);
    if (
      !sources.includes(source) ||
      (archivedRow?.archived_sources ?? []).includes(source)
    ) {
      return { ok: false, error: "Unknown source" };
    }
  }

  try {
    await updateDefaultSource(user.id, source);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function setSourceArchived(
  source: string,
  archived: boolean,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (source === "all") return { ok: false, error: "Unknown source" };
  if (archived) {
    const sources = await getSelectableSources(user.id);
    if (!sources.includes(source)) {
      return { ok: false, error: "Unknown source" };
    }
  }

  try {
    await setSourceArchivedFlag(user.id, source, archived);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

const FIXED_LABELS_MAX_ENTRIES = 50;
const FIXED_LABELS_MAX_LENGTH = 60;

export async function setFixedLabels(labels: string[]): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (
    !Array.isArray(labels) ||
    labels.some((label) => typeof label !== "string")
  ) {
    return { ok: false, error: "Invalid data" };
  }

  const normalized = Array.from(
    new Set(labels.map((label) => normalizeFixedLabel(label)).filter(Boolean)),
  );

  if (normalized.some((label) => label.length > FIXED_LABELS_MAX_LENGTH)) {
    return {
      ok: false,
      error: `Each label must be ${FIXED_LABELS_MAX_LENGTH} characters or fewer`,
    };
  }
  if (normalized.length > FIXED_LABELS_MAX_ENTRIES) {
    return {
      ok: false,
      error: `Keep the list to ${FIXED_LABELS_MAX_ENTRIES} labels or fewer`,
    };
  }

  try {
    await updateFixedLabels(user.id, normalized);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function saveAssistantKey(
  input: AssistantKeyInput,
): Promise<ActionResult> {
  const parsed = assistantKeySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await updateAssistantKey(user.id, {
      ai_provider: parsed.data.provider,
      ai_model: parsed.data.model?.trim() || null,
      ai_api_key: encryptSecret(parsed.data.apiKey, `${user.id}:ai`),
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function removeAssistantKey(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await updateAssistantKey(user.id, {
      ai_provider: null,
      ai_model: null,
      ai_api_key: null,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<ActionResult> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const timezone = parsed.data.timezone?.trim() || null;

  try {
    await updateGeneralSettings(user.id, {
      currencies: parsed.data.currencies,
      base_currency: parsed.data.baseCurrency,
      timezone,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}
