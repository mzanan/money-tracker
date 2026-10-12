import { ActionError } from "@/lib/actionError";
import {
  assetRef,
  bridgeRef,
  feesRef,
  transitRef,
  uncategorizedRef,
  type AccountRef,
} from "@/lib/ledger/accounts";
import { isExactInMinor, toMinor } from "@/lib/ledger/amounts";
import type { ScaleOf } from "@/lib/ledger/scale";
import type { PostingLine } from "@/lib/ledger/posting";
import type { LedgerEntryRole, TransactionKind } from "@/types/db";

export interface Money {
  amount: number;
  currency: string;
}

export class AmountPrecisionError extends ActionError {}

export function minorOf(money: Money, scaleOf: ScaleOf): number {
  const scale = scaleOf(money.currency);
  if (!isExactInMinor(money.amount, scale)) {
    throw new AmountPrecisionError(
      `${money.amount} ${money.currency} has more than ${scale} decimals`,
    );
  }
  return toMinor(money.amount, scale);
}

function line(
  account: AccountRef,
  amount: number,
  role: LedgerEntryRole,
  occurredOn: string,
): PostingLine {
  return { account, amount, role, occurredOn, legacyTxId: null };
}

function pair(
  from: AccountRef,
  to: AccountRef,
  minor: number,
  role: LedgerEntryRole,
  occurredOn: string,
): PostingLine[] {
  return [line(from, -minor, role, occurredOn), line(to, minor, role, occurredOn)];
}

export function feeLines(
  source: string,
  fee: Money,
  occurredOn: string,
  scaleOf: ScaleOf,
): PostingLine[] {
  return pair(
    assetRef(source, fee.currency),
    feesRef(fee.currency),
    minorOf(fee, scaleOf),
    "fee",
    occurredOn,
  );
}

export function flowLines({
  kind,
  source,
  money,
  occurredOn,
  role = "amount",
  scaleOf,
}: {
  kind: TransactionKind;
  source: string;
  money: Money;
  occurredOn: string;
  role?: LedgerEntryRole;
  scaleOf: ScaleOf;
}): PostingLine[] {
  const asset = assetRef(source, money.currency);
  const category = uncategorizedRef(kind, money.currency);
  const minor = minorOf(money, scaleOf);
  return kind === "expense"
    ? pair(asset, category, minor, role, occurredOn)
    : pair(category, asset, minor, role, occurredOn);
}

export interface TransferLeg {
  source: string;
  money: Money;
  occurredOn: string | null;
}

export function transferLines({
  sent,
  received,
  role = "amount",
  scaleOf,
}: {
  sent: TransferLeg & { occurredOn: string };
  received: TransferLeg;
  role?: LedgerEntryRole;
  scaleOf: ScaleOf;
}): PostingLine[] {
  const sentMinor = minorOf(sent.money, scaleOf);
  const receivedMinor = minorOf(received.money, scaleOf);
  const sameCurrency = sent.money.currency === received.money.currency;
  if (sameCurrency && sentMinor !== receivedMinor) {
    throw new AmountPrecisionError(
      "Sent and received amounts differ; record the difference as a fee",
    );
  }
  const lines = [
    line(assetRef(sent.source, sent.money.currency), -sentMinor, role, sent.occurredOn),
  ];
  if (received.occurredOn === null) {
    lines.push(
      line(transitRef(sent.money.currency), sentMinor, role, sent.occurredOn),
    );
    return lines;
  }
  lines.push(
    line(
      assetRef(received.source, received.money.currency),
      receivedMinor,
      role,
      received.occurredOn,
    ),
  );
  if (!sameCurrency) {
    lines.push(
      line(bridgeRef(sent.money.currency), sentMinor, role, sent.occurredOn),
      line(
        bridgeRef(received.money.currency),
        -receivedMinor,
        role,
        received.occurredOn,
      ),
    );
  }
  return lines;
}
