import {
  ACCOUNT_PURPOSE_LABELS,
  ACCOUNT_PURPOSES,
  type AccountPurpose,
} from "@/lib/constants/accountPurposes";
import { formatDateShort, isValidCalendarDate } from "@/lib/dates";

export interface HeldAccount {
  purpose: AccountPurpose;
  expectedOn: string | null;
}

export type HeldAccounts = Record<string, HeldAccount>;

export function isAccountPurpose(value: unknown): value is AccountPurpose {
  return (
    typeof value === "string" &&
    (ACCOUNT_PURPOSES as ReadonlyArray<string>).includes(value)
  );
}

export function heldAccountsFrom(
  rows: ReadonlyArray<{
    source: string;
    purpose: string | null;
    expected_on: string | null;
  }>,
): HeldAccounts {
  const held: HeldAccounts = {};
  for (const row of rows) {
    if (!isAccountPurpose(row.purpose)) continue;
    held[row.source] = { purpose: row.purpose, expectedOn: row.expected_on };
  }
  return held;
}

export const NO_PURPOSE = "none";

export type PurposeChoice = AccountPurpose | typeof NO_PURPOSE;

export function purposeFromChoice(
  choice: PurposeChoice,
): AccountPurpose | null {
  return choice === NO_PURPOSE ? null : choice;
}

export function heldSourceSet(held: HeldAccounts): ReadonlySet<string> {
  return new Set(Object.keys(held));
}

export function accountPurposeError(
  purpose: unknown,
  expectedOn: unknown,
): string | null {
  if (purpose !== null && !isAccountPurpose(purpose)) return "Invalid purpose";
  if (expectedOn === null) return null;
  if (typeof expectedOn !== "string" || !isValidCalendarDate(expectedOn)) {
    return "Invalid expected date";
  }
  if (purpose === null) return "Pick a purpose before setting a date";
  return null;
}

export function heldAccountSummary(account: HeldAccount): string {
  const label = ACCOUNT_PURPOSE_LABELS[account.purpose];
  return account.expectedOn
    ? `${label} · back ${formatDateShort(account.expectedOn)}`
    : `${label} · no return date`;
}

export function accountRowMeta(
  count: number,
  held: HeldAccount | undefined,
): string {
  const transactions =
    count > 0
      ? `${count} transaction${count === 1 ? "" : "s"}`
      : "No transactions yet";
  return held ? `${heldAccountSummary(held)} · ${transactions}` : transactions;
}

export type AccountGroup = "spendable" | "held";

export function inAccountGroup(
  source: string,
  held: HeldAccounts,
  group: AccountGroup,
): boolean {
  return source in held === (group === "held");
}
