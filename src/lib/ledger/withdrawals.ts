import { MANUAL_SOURCE } from "@/lib/constants/sources";
import {
  EXTERNAL_ID_PREFIX,
  LEG_IN_SUFFIX,
  LEG_OUT_SUFFIX,
  withdrawalGroupFrom,
} from "@/lib/externalIds";
import {
  assetRef,
  bridgeRef,
  feesRef,
  uncategorizedRef,
} from "@/lib/ledger/accounts";
import {
  AmountPrecisionError,
  minorOf,
  type Money,
} from "@/lib/ledger/builders";
import type {
  ExternalRef,
  LedgerDraft,
  PostingLine,
} from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";

export function withdrawalRef(
  origin: string,
  group: string,
  side?: "out" | "in",
): ExternalRef {
  const suffix =
    side === "out" ? LEG_OUT_SUFFIX : side === "in" ? LEG_IN_SUFFIX : "";
  return {
    origin,
    externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}${suffix}`,
  };
}

export function exchangeRefs(group: string): ExternalRef[] {
  return [LEG_OUT_SUFFIX, LEG_IN_SUFFIX].map((suffix) => ({
    origin: MANUAL_SOURCE,
    externalId: `${EXTERNAL_ID_PREFIX.exchange}${group}${suffix}`,
  }));
}

export function withdrawalGroupOf(draft: LedgerDraft): string | null {
  for (const ref of draft.externalRefs) {
    const group = withdrawalGroupFrom(ref.externalId);
    if (group) return group;
  }
  return null;
}

function isBankPrincipal(line: PostingLine): boolean {
  return (
    line.account.kind === "asset" &&
    line.account.key !== MANUAL_SOURCE &&
    line.role === "withdrawal"
  );
}

export function bankWithdrawalLine(draft: LedgerDraft): PostingLine | null {
  return (
    draft.lines.find((line) => isBankPrincipal(line) && line.amount < 0) ?? null
  );
}

export function hasCashLeg(draft: LedgerDraft): boolean {
  return draft.lines.some(
    (line) =>
      line.account.kind === "asset" &&
      line.account.key === MANUAL_SOURCE &&
      line.role === "withdrawal",
  );
}

export function withoutCashLeg(draft: LedgerDraft, group: string): LedgerDraft {
  const bank = bankWithdrawalLine(draft);
  if (!bank) return draft;
  const fees = draft.lines.filter((line) => line.role === "fee");
  return {
    ...draft,
    lines: [
      bank,
      {
        ...bank,
        account: uncategorizedRef("expense", bank.account.currency),
        amount: -bank.amount,
      },
      ...fees,
    ],
    externalRefs: [
      ...draft.externalRefs.filter(
        (ref) => withdrawalGroupFrom(ref.externalId) === null,
      ),
      withdrawalRef(bank.account.key, group),
    ],
  };
}

export function withCashLeg(
  draft: LedgerDraft,
  group: string,
  cash: Money,
  scaleOf: ScaleOf,
): LedgerDraft {
  const bank = bankWithdrawalLine(draft);
  if (!bank) return draft;
  const cashMinor = minorOf(cash, scaleOf);
  const sameCurrency = cash.currency === bank.account.currency;
  if (sameCurrency && cashMinor > -bank.amount) {
    throw new AmountPrecisionError(
      "The cash amount can't be more than the withdrawal charge",
    );
  }
  const gap = sameCurrency ? -bank.amount - cashMinor : 0;
  const bankLine: PostingLine = sameCurrency
    ? { ...bank, amount: -cashMinor }
    : bank;
  const bankMinor = -bankLine.amount;
  const gapFees: PostingLine[] =
    gap > 0
      ? [
          { ...bank, amount: -gap, role: "fee", legacyTxId: null },
          {
            ...bank,
            account: feesRef(bank.account.currency),
            amount: gap,
            role: "fee",
            legacyTxId: null,
          },
        ]
      : [];
  const cashLine: PostingLine = {
    ...bank,
    account: assetRef(MANUAL_SOURCE, cash.currency),
    amount: cashMinor,
    legacyTxId: null,
  };
  const bridges: PostingLine[] = sameCurrency
    ? []
    : [
        {
          ...cashLine,
          account: bridgeRef(bank.account.currency),
          amount: bankMinor,
        },
        { ...cashLine, account: bridgeRef(cash.currency), amount: -cashMinor },
      ];
  const fees = draft.lines.filter((line) => line.role === "fee");
  return {
    ...draft,
    lines: [bankLine, cashLine, ...bridges, ...fees, ...gapFees],
    externalRefs: [
      ...draft.externalRefs.filter(
        (ref) => withdrawalGroupFrom(ref.externalId) === null,
      ),
      withdrawalRef(bank.account.key, group, "out"),
      withdrawalRef(MANUAL_SOURCE, group, "in"),
    ],
  };
}
