import { eq, inArray, isNotNull } from "drizzle-orm";
import { cache } from "react";

import { forUser } from "@/lib/db/scope";
import { accounts } from "@/lib/db/schema";
import {
  accountCurrencyError,
  declaredAccountCurrencies,
  type AccountCurrencies,
} from "@/lib/accountCurrencies";
import { heldAccountsFrom, type HeldAccounts } from "@/lib/accountPurpose";
import {
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";

import type { Account } from "@/types/db";

export type { AccountLabels } from "@/lib/constants/sources";
export { resolveSourceLabel } from "@/lib/constants/sources";

export async function listAccounts(userId: string): Promise<Account[]> {
  return forUser(userId).selectFrom(accounts);
}

export async function listAccountSources(userId: string): Promise<string[]> {
  const rows = await forUser(userId)
    .select({ source: accounts.source })
    .from(accounts);
  return rows.map((row) => row.source);
}

export async function getAccountBySource(
  userId: string,
  source: string,
): Promise<Account | null> {
  const rows = await forUser(userId)
    .selectFrom(accounts, eq(accounts.source, source))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAccountLabels(userId: string): Promise<AccountLabels> {
  const rows = await listAccounts(userId);
  return Object.fromEntries(rows.map((row) => [row.source, row.label]));
}

export const getAccountCurrencies = cache(async function getAccountCurrencies(
  userId: string,
  sources?: string[],
): Promise<AccountCurrencies> {
  if (sources?.length === 0) return {};
  const rows = await forUser(userId)
    .select({ source: accounts.source, currency: accounts.currency })
    .from(accounts, sources ? inArray(accounts.source, sources) : undefined);
  return declaredAccountCurrencies(rows);
});

export const getHeldAccounts = cache(async function getHeldAccounts(
  userId: string,
): Promise<HeldAccounts> {
  const rows = await forUser(userId)
    .select({
      source: accounts.source,
      purpose: accounts.purpose,
      expected_on: accounts.expected_on,
    })
    .from(accounts, isNotNull(accounts.purpose));
  return heldAccountsFrom(rows);
});

export async function sourceCurrencyError(
  userId: string,
  source: string,
  currency: string,
  side: "charged" | "own",
): Promise<string | null> {
  const [accountCurrencies, accountLabels] = await Promise.all([
    getAccountCurrencies(userId, [source]),
    getAccountLabels(userId),
  ]);
  return accountCurrencyError({
    currency,
    allowed: accountCurrencies[source],
    accountLabel: resolveSourceLabel(source, accountLabels),
    side,
  });
}

type AccountEdit = Partial<
  Pick<Account, "label" | "currency" | "purpose" | "expected_on">
>;

export async function saveAccountLabel(
  userId: string,
  source: string,
  label: string,
): Promise<string> {
  const [row] = await forUser(userId)
    .insert(accounts, { source, label })
    .onConflictDoUpdate({
      target: [accounts.user_id, accounts.source],
      set: { label },
    })
    .returning({ id: accounts.id });
  return row.id;
}

export async function insertAccountIfMissing(
  userId: string,
  source: string,
  label: string,
): Promise<void> {
  await forUser(userId)
    .insert(accounts, { source, label })
    .onConflictDoNothing();
}

export async function upsertAccountDetails(
  userId: string,
  source: string,
  label: string,
  details: AccountEdit,
): Promise<void> {
  await forUser(userId)
    .insert(accounts, { source, label, ...details })
    .onConflictDoUpdate({
      target: [accounts.user_id, accounts.source],
      set: details,
    });
}

export async function deleteAccountBySource(
  userId: string,
  source: string,
): Promise<boolean> {
  const deleted = await forUser(userId)
    .delete(accounts, eq(accounts.source, source))
    .returning({ id: accounts.id });
  return deleted.length > 0;
}
