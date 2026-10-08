import {
  isAccountCurrency,
  type AccountCurrencies,
} from "@/lib/accountCurrencies";
import { convert } from "@/lib/currency";
import { transferFeeExternalId, transferFeeGroupFrom } from "@/lib/externalIds";
import { transferLegsAreNet } from "@/lib/transfer";
import type { FxRates, Transaction } from "@/types/db";

const MAX_PASSES = 6;

interface Funding {
  day: string;
  received: number;
  sentBase: number;
  rate: number;
}

export interface CostBasisResult {
  transactions: Transaction[];
  fundedSources: string[];
}

function chronological(a: Transaction, b: Transaction): number {
  return (
    a.occurred_on.localeCompare(b.occurred_on) ||
    a.occurred_at.localeCompare(b.occurred_at)
  );
}

function rateAt(list: ReadonlyArray<Funding>, day: string): number | null {
  let rate: number | null = null;
  for (const funding of list) {
    if (funding.day > day) break;
    rate = funding.rate;
  }
  return rate;
}

function sameRates(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [id, rate] of b) {
    const other = a.get(id);
    if (other === undefined || Math.abs(other - rate) > 1e-9 * rate) {
      return false;
    }
  }
  return true;
}

function baseRateIn(snapshot: FxRates, base: string): number | null {
  return snapshot[base] ?? (base === "USD" ? 1 : null);
}

function netSent(
  sent: Transaction,
  received: Transaction,
  group: Transaction[],
) {
  const groupId = received.transfer_group ?? "";
  const originFee = group
    .filter((tx) => tx.external_id === transferFeeExternalId(groupId))
    .reduce((sum, tx) => sum + tx.amount_original, 0);
  const hasDestinationFee = group.some(
    (tx) => tx.external_id === transferFeeExternalId(groupId, "destination"),
  );
  const legsAreNet =
    sent.currency_original !== received.currency_original ||
    transferLegsAreNet([sent, received], originFee, hasDestinationFee);
  return legsAreNet ? sent.amount_original : sent.amount_original - originFee;
}

export function applyCostBasis(
  txs: Transaction[],
  accountCurrencies: AccountCurrencies,
  base: string,
): CostBasisResult {
  const isCostRow = (tx: Transaction) =>
    tx.currency_original !== base &&
    isAccountCurrency(accountCurrencies[tx.source], tx.currency_original);

  const groups = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const group = tx.transfer_group ?? transferFeeGroupFrom(tx.external_id);
    if (!group) continue;
    groups.set(group, [...(groups.get(group) ?? []), tx]);
  }

  const incoming = txs
    .filter((tx) => tx.kind === "income" && tx.transfer_group && isCostRow(tx))
    .sort(chronological);

  let funding = new Map<string, Funding[]>();
  let ownRate = new Map<string, number>();

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const previous = funding;
    const valueInBase = (tx: Transaction, amount: number): number | null => {
      const list = previous.get(tx.source);
      if (list && isCostRow(tx)) {
        const rate = rateAt(list, tx.occurred_on);
        if (rate !== null) return amount / rate;
      }
      try {
        return convert(
          amount,
          tx.currency_original,
          base,
          tx.fx_rates_snapshot,
        );
      } catch {
        return null;
      }
    };

    const nextFunding = new Map<string, Funding[]>();
    const nextOwnRate = new Map<string, number>();
    for (const received of incoming) {
      const group = groups.get(received.transfer_group ?? "") ?? [];
      const sent = group.find(
        (tx) => tx.kind === "expense" && tx.transfer_group,
      );
      if (!sent) continue;
      const sentBase = valueInBase(sent, netSent(sent, received, group));
      if (sentBase === null || !(sentBase > 0)) continue;
      nextOwnRate.set(received.id, received.amount_original / sentBase);
      const list = nextFunding.get(received.source) ?? [];
      const last = list.at(-1);
      if (last && last.day === received.occurred_on) {
        last.received += received.amount_original;
        last.sentBase += sentBase;
        last.rate = last.received / last.sentBase;
      } else {
        list.push({
          day: received.occurred_on,
          received: received.amount_original,
          sentBase,
          rate: received.amount_original / sentBase,
        });
      }
      nextFunding.set(received.source, list);
    }

    const stable = sameRates(ownRate, nextOwnRate);
    funding = nextFunding;
    ownRate = nextOwnRate;
    if (stable) break;
  }

  if (funding.size === 0) return { transactions: txs, fundedSources: [] };

  const transactions = txs.map((tx) => {
    const list = funding.get(tx.source);
    if (!list || !isCostRow(tx)) return tx;
    const rate = ownRate.get(tx.id) ?? rateAt(list, tx.occurred_on);
    const baseRate = baseRateIn(tx.fx_rates_snapshot, base);
    if (rate === null || baseRate === null) return tx;
    return {
      ...tx,
      fx_rates_snapshot: {
        ...tx.fx_rates_snapshot,
        [base]: baseRate,
        [tx.currency_original]: rate * baseRate,
      },
    };
  });

  return { transactions, fundedSources: [...funding.keys()] };
}

export function isSingleFundedSource(
  transactions: ReadonlyArray<Pick<Transaction, "source">>,
  fundedSources: ReadonlyArray<string>,
): boolean {
  const sources = new Set(transactions.map((tx) => tx.source));
  return sources.size === 1 && fundedSources.includes([...sources][0]);
}
