"use server";

import { revalidatePath } from "next/cache";

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
import { accountPurposeError } from "@/lib/accountPurpose";
import type { AccountPurpose } from "@/lib/constants/accountPurposes";
import {
  deleteAccountBySource,
  insertAccountIfMissing,
  listAccounts,
  saveAccountLabel,
  upsertAccountDetails,
} from "@/lib/data/accounts";
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

  const id = await saveAccountLabel(user.id, normalizedSource, trimmedLabel);

  revalidatePath("/", "layout");
  return { ok: true, data: { id } };
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

  await insertAccountIfMissing(user.id, source, label);

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

  await upsertAccountDetails(
    user.id,
    normalizedSource,
    labelForSource(normalizedSource),
    { currency },
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAccountPurpose(
  source: string,
  purpose: AccountPurpose | null,
  expectedOn: string | null,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalizedSource = normalizeSource(source);
  if (!normalizedSource) return { ok: false, error: "Invalid account" };

  const guardError = guardEditable(normalizedSource);
  if (guardError) return { ok: false, error: guardError };

  const inputError = accountPurposeError(purpose, expectedOn);
  if (inputError) return { ok: false, error: inputError };

  const values = { purpose, expected_on: expectedOn };
  await upsertAccountDetails(
    user.id,
    normalizedSource,
    labelForSource(normalizedSource),
    values,
  );

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

  const removed = await deleteAccountBySource(user.id, normalizedSource);

  revalidatePath("/", "layout");
  return { ok: true, data: { removed } };
}
