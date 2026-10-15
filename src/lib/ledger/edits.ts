import { kindOfSource } from "@/lib/constants/sources";
import {
  EXTERNAL_ID_PREFIX,
  isSyncedExternalId,
  LEG_IN_SUFFIX,
  LEG_OUT_SUFFIX,
} from "@/lib/externalIds";
import { flowLines, minorFlowLines, type Money } from "@/lib/ledger/builders";
import { sameMinorAmount } from "@/lib/ledger/amounts";
import {
  assetLines,
  isOwnMovement,
  movementType,
  principalAssetLines,
} from "@/lib/ledger/movements";
import type {
  ExternalRef,
  LedgerDraft,
  PostingLine,
} from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";
import type { TransactionKind } from "@/types/db";
import type { FlowFields } from "@/lib/schemas/transaction";
import type { Movement } from "@/types/ledger";

export function isSyncedMovement(movement: Movement): boolean {
  return assetLines(movement).some((line) => kindOfSource(line.key) === "api");
}

export function hasSyncedRef(movement: Movement): boolean {
  return movement.externalRefs.some(
    (ref) =>
      kindOfSource(ref.origin) === "api" && isSyncedExternalId(ref.externalId),
  );
}

export function isWithdrawalMovement(movement: Movement): boolean {
  return movement.lines.some((line) => line.role === "withdrawal");
}

export function isTransferMovement(movement: Movement): boolean {
  return isOwnMovement(movement);
}

export function singleDate(draft: LedgerDraft): string | null {
  const dates = new Set(draft.lines.map((line) => line.occurredOn));
  return dates.size === 1 ? [...dates][0] : null;
}

export function withDate(draft: LedgerDraft, occurredOn: string): LedgerDraft {
  return {
    ...draft,
    occurredOn,
    lines: draft.lines.map((line) => ({ ...line, occurredOn })),
  };
}

function isPrincipalAsset(line: PostingLine): boolean {
  return (
    line.account.kind === "asset" &&
    (line.role === "amount" || line.role === "withdrawal")
  );
}

export function legDate(draft: LedgerDraft, source?: string): string {
  if (singleDate(draft) !== null || source === undefined) {
    return draft.occurredOn;
  }
  return (
    draft.lines.find(
      (line) => isPrincipalAsset(line) && line.account.key === source,
    )?.occurredOn ?? draft.occurredOn
  );
}

export function withLegDate(
  draft: LedgerDraft,
  source: string | undefined,
  occurredOn: string,
): LedgerDraft {
  if (singleDate(draft) !== null) return withDate(draft, occurredOn);
  const from = legDate(draft, source);
  const lines = draft.lines.map((line) =>
    line.occurredOn === from ? { ...line, occurredOn } : line,
  );
  const earliest = lines.reduce(
    (oldest, line) => (line.occurredOn < oldest ? line.occurredOn : oldest),
    lines[0]?.occurredOn ?? occurredOn,
  );
  return { ...draft, occurredOn: earliest, lines };
}

export function withSource(
  draft: LedgerDraft,
  from: string,
  to: string,
): LedgerDraft {
  return {
    ...draft,
    lines: draft.lines.map((line) =>
      line.account.kind === "asset" && line.account.key === from
        ? { ...line, account: { ...line.account, key: to } }
        : line,
    ),
  };
}

export function withFlow(
  draft: LedgerDraft,
  flow: {
    kind: TransactionKind;
    source: string;
    money: Money;
    occurredOn: string;
  },
  scaleOf: ScaleOf,
): LedgerDraft {
  const fees: PostingLine[] = draft.lines
    .filter((line) => line.role === "fee")
    .map((line) => ({ ...line, occurredOn: flow.occurredOn }));
  return {
    ...draft,
    occurredOn: flow.occurredOn,
    lines: [...flowLines({ ...flow, scaleOf }), ...fees],
  };
}

export function isBudgetShiftable(movement: Movement): boolean {
  return (
    isWithdrawalMovement(movement) ||
    (isOwnMovement(movement) && movementType(movement) !== "exchange")
  );
}

export function feeOnlyDraft(
  draft: LedgerDraft,
  note: string,
): LedgerDraft | null {
  const lines = draft.lines.filter((line) => line.role === "fee");
  return lines.length === 0
    ? null
    : {
        ...draft,
        note,
        comment: null,
        tags: [],
        recurringId: null,
        isFixed: null,
        budgetMonth: null,
        lines,
        externalRefs: [],
      };
}

export function mirrorRef(source: string, transactionId: string): ExternalRef {
  return {
    origin: source,
    externalId: `${EXTERNAL_ID_PREFIX.transfer}${transactionId}`,
  };
}

function isTransferBookkeepingRef(ref: ExternalRef): boolean {
  return (
    ref.externalId.startsWith(EXTERNAL_ID_PREFIX.transfer) ||
    ref.externalId.startsWith(EXTERNAL_ID_PREFIX.transferFee)
  );
}

interface StandaloneLeg {
  source: string;
  currency: string;
  minor: number;
  occurredOn: string;
}

function standaloneLegs(draft: LedgerDraft): StandaloneLeg[] {
  const mirrors = new Set(
    draft.externalRefs
      .filter((ref) => ref.externalId.startsWith(EXTERNAL_ID_PREFIX.transfer))
      .map((ref) => ref.origin),
  );
  const legs = new Map<string, StandaloneLeg>();
  for (const line of draft.lines) {
    if (line.account.kind !== "asset" || mirrors.has(line.account.key)) {
      continue;
    }
    const id = `${line.account.key}|${line.account.currency}`;
    const leg = legs.get(id) ?? {
      source: line.account.key,
      currency: line.account.currency,
      minor: 0,
      occurredOn: line.occurredOn,
    };
    leg.minor += line.amount;
    if (line.role === "amount" || line.role === "withdrawal") {
      leg.occurredOn = line.occurredOn;
    }
    legs.set(id, leg);
  }
  return [...legs.values()].filter((leg) => leg.minor !== 0);
}

function legIndexFor(ref: ExternalRef, legs: StandaloneLeg[]): number {
  const candidates = legs
    .map((leg, index) => ({ leg, index }))
    .filter(({ leg }) => leg.source === ref.origin);
  if (candidates.length === 0) return 0;
  const wantsIncome = ref.externalId.endsWith(LEG_IN_SUFFIX);
  const wantsExpense = ref.externalId.endsWith(LEG_OUT_SUFFIX);
  const bySide = candidates.find(({ leg }) =>
    wantsIncome ? leg.minor > 0 : wantsExpense ? leg.minor < 0 : false,
  );
  return (bySide ?? candidates[0]).index;
}

export function splitTransfer(draft: LedgerDraft): LedgerDraft[] {
  const legs = standaloneLegs(draft);
  const refs = draft.externalRefs.filter(
    (ref) => !isTransferBookkeepingRef(ref),
  );
  const refsByLeg = new Map<number, ExternalRef[]>();
  for (const ref of refs) {
    const index = legIndexFor(ref, legs);
    refsByLeg.set(index, [...(refsByLeg.get(index) ?? []), ref]);
  }
  return legs.map((leg, index) => {
    const kind = leg.minor < 0 ? "expense" : "income";
    const extra =
      index === 0 ? {} : { comment: null, recurringId: null, isFixed: null };
    return {
      ...draft,
      ...extra,
      transitDestination: null,
      occurredOn: leg.occurredOn,
      budgetMonth:
        draft.budgetMonth === leg.occurredOn.slice(0, 7)
          ? null
          : draft.budgetMonth,
      lines: minorFlowLines({
        kind,
        source: leg.source,
        currency: leg.currency,
        minor: Math.abs(leg.minor),
        occurredOn: leg.occurredOn,
      }),
      externalRefs: refsByLeg.get(index) ?? [],
    };
  });
}

export function matchesPrincipalFlow(
  movement: Movement,
  requested: FlowFields,
  scaleOf: ScaleOf,
): boolean {
  return principalAssetLines(movement).some(
    (line) =>
      line.currency === requested.currency &&
      sameMinorAmount(
        Math.abs(line.amount),
        requested.amount,
        scaleOf(line.currency),
      ) &&
      (line.amount < 0 ? "expense" : "income") === requested.kind,
  );
}
