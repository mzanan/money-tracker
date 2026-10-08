"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import {
  invalidAccountCurrencies,
  serializeAccountCurrencies,
} from "@/lib/accountCurrencies";
import {
  capitalizeLabel,
  isAccountNameTaken,
  kindOfSource,
  labelForSource,
  normalizeSource,
  SOURCE_NAME_HINT,
} from "@/lib/constants/sources";
import { listAccounts } from "@/lib/data/accounts";
import { getImportedSources } from "@/lib/data/sources";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

function guardEditable(source: string): string | null {
  const kind = kindOfSource(source);
  if (kind === "manual" || kind === "api") {
    return "This account can't be renamed or removed";
  }
  return null;
}

export async function upsertAccountLabel(
  source: string,
  label: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalizedSource = normalizeSource(source);
  if (!normalizedSource) return { ok: false, error: "Invalid account" };

  const guardError = guardEditable(normalizedSource);
  if (guardError) return { ok: false, error: guardError };

  const trimmedLabel = capitalizeLabel(label.trim());
  if (!trimmedLabel) return { ok: false, error: "Name is required" };

  const [row] = await db
    .insert(accounts)
    .values({ user_id: user.id, source: normalizedSource, label: trimmedLabel })
    .onConflictDoUpdate({
      target: [accounts.user_id, accounts.source],
      set: { label: trimmedLabel },
    })
    .returning({ id: accounts.id });

  revalidatePath("/", "layout");
  return { ok: true, data: { id: row.id } };
}

export async function createAccount(
  name: string,
): Promise<ActionResult<{ source: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const label = capitalizeLabel(name.trim());
  if (!label) return { ok: false, error: "Name is required" };

  const source = normalizeSource(label);
  if (!source) return { ok: false, error: SOURCE_NAME_HINT };

  const [sourceRows, accountRows] = await Promise.all([
    getImportedSources(user.id),
    listAccounts(user.id),
  ]);
  const existingSources = ["manual", ...sourceRows.map((row) => row.source)];
  const accountLabels = Object.fromEntries(
    accountRows.map((row) => [row.source, row.label]),
  );
  if (isAccountNameTaken(label, source, existingSources, accountLabels)) {
    return { ok: false, error: `An account named "${label}" already exists` };
  }

  await db
    .insert(accounts)
    .values({ user_id: user.id, source, label })
    .onConflictDoNothing();

  revalidatePath("/", "layout");
  return { ok: true, data: { source } };
}

export async function setAccountCurrencies(
  source: string,
  currencies: string[],
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalizedSource = normalizeSource(source);
  if (!normalizedSource) return { ok: false, error: "Invalid account" };

  const guardError = guardEditable(normalizedSource);
  if (guardError) return { ok: false, error: guardError };
  if (invalidAccountCurrencies(currencies)) {
    return { ok: false, error: "Unsupported currency" };
  }
  const currency = serializeAccountCurrencies(currencies);

  await db
    .insert(accounts)
    .values({
      user_id: user.id,
      source: normalizedSource,
      label: labelForSource(normalizedSource),
      currency,
    })
    .onConflictDoUpdate({
      target: [accounts.user_id, accounts.source],
      set: { currency },
    });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAccount(
  source: string,
): Promise<ActionResult<{ removed: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalizedSource = normalizeSource(source);
  if (!normalizedSource) return { ok: false, error: "Invalid account" };

  const guardError = guardEditable(normalizedSource);
  if (guardError) return { ok: false, error: guardError };

  const deleted = await db
    .delete(accounts)
    .where(
      and(eq(accounts.user_id, user.id), eq(accounts.source, normalizedSource)),
    )
    .returning({ id: accounts.id });

  revalidatePath("/", "layout");
  return { ok: true, data: { removed: deleted.length > 0 } };
}
