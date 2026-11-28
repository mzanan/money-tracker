import { isSupportedCurrency } from "@/lib/constants/currencies";
import type { DuplicateStep } from "@/lib/constants/sheetImport";
import { csvContentId, csvExternalId } from "@/lib/csv/ledgerDraft";
import { roundToScale } from "@/lib/currency";
import { dayDiff } from "@/lib/dates";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { candidateMatchOf, type FlowCandidate } from "@/lib/ledger/candidates";
import type { CheckRow, SheetRowCheck } from "@/lib/sheetImport/check";
import { fold } from "@/lib/sheetImport/parse";
import { SHEET_ID_PREFIX } from "@/lib/sheetImport/fingerprint";

export const MAX_JUDGE_CHARS = 60;
export const JUDGE_BATCH = 100;

const LEGAL_SUFFIX =
  /\b(s\.?a\.?|s\.?l\.?|s\.?r\.?l\.?|s\.?a\.?s\.?|llc|inc|ltd|corp|co|gmbh|pty)\b\.?/g;
const SAME_AMOUNT = 0.005;

export interface LadderRow {
  occurredOn: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  description: string;
}

export interface JudgePair {
  id: string;
  row: number;
  candidate: FlowCandidate;
  incoming: string;
  existing: string;
  dayGap: number;
}

export interface LadderMatch {
  step: DuplicateStep;
  candidate: FlowCandidate;
}

export function judgeTokens(text: string | null): string[] {
  return fold(text ?? "")
    .replace(LEGAL_SUFFIX, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function judgeText(text: string | null): string {
  return judgeTokens(text).join(" ").slice(0, MAX_JUDGE_CHARS);
}

function isSheetImport(candidate: FlowCandidate): boolean {
  return candidate.externalRefs.some((ref) =>
    ref.externalId.startsWith(`${EXTERNAL_ID_PREFIX.csv}${SHEET_ID_PREFIX}`),
  );
}

function isReread(
  row: LadderRow,
  candidate: FlowCandidate,
  source: string,
): boolean {
  return (
    candidate.source === source &&
    isSheetImport(candidate) &&
    candidate.kind === row.kind &&
    candidate.currency === row.currency &&
    Math.abs(candidate.amount - row.amount) < SAME_AMOUNT &&
    candidate.occurredOn === row.occurredOn
  );
}

export function descriptionsMatch(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.some((_, start) =>
    short.every((token, offset) => long[start + offset] === token),
  );
}

export function deterministicMatches(
  rows: ReadonlyArray<LadderRow | null>,
  candidates: ReadonlyArray<FlowCandidate[]>,
  source: string,
): { matches: (LadderMatch | null)[]; pairs: JudgePair[] } {
  const used = new Set<string>();
  const matches: (LadderMatch | null)[] = rows.map(() => null);
  rows.forEach((row, i) => {
    if (!row) return;
    const reread = candidates[i].find(
      (c) => !used.has(c.id) && isReread(row, c, source),
    );
    if (reread) {
      used.add(reread.id);
      matches[i] = { step: "reread", candidate: reread };
    }
  });
  rows.forEach((row, i) => {
    if (!row || matches[i]) return;
    const incoming = judgeTokens(row.description);
    const named = candidates[i].find(
      (c) =>
        !used.has(c.id) && descriptionsMatch(incoming, judgeTokens(c.note)),
    );
    if (named) {
      used.add(named.id);
      matches[i] = { step: "description", candidate: named };
    }
  });
  const pairs: JudgePair[] = [];
  rows.forEach((row, i) => {
    if (!row || matches[i]) return;
    for (const candidate of candidates[i]) {
      if (used.has(candidate.id)) continue;
      pairs.push({
        id: `p${pairs.length + 1}`,
        row: i,
        candidate,
        incoming: judgeText(row.description),
        existing: judgeText(candidate.note),
        dayGap: Math.abs(dayDiff(row.occurredOn, candidate.occurredOn)),
      });
    }
  });
  return { matches, pairs: pairs.filter((p) => p.incoming && p.existing) };
}

export function assignJudged(
  matches: (LadderMatch | null)[],
  pairs: JudgePair[],
  same: ReadonlySet<string>,
): (LadderMatch | null)[] {
  const used = new Set(matches.flatMap((m) => (m ? [m.candidate.id] : [])));
  const out = [...matches];
  for (const pair of pairs) {
    if (out[pair.row] || used.has(pair.candidate.id) || !same.has(pair.id)) {
      continue;
    }
    used.add(pair.candidate.id);
    out[pair.row] = { step: "ai", candidate: pair.candidate };
  }
  return out;
}

export interface ExactMatch {
  step: DuplicateStep;
  transactionId: string;
}

export function legacyIdOf(row: CheckRow): string | null {
  return row.currency && isSupportedCurrency(row.currency)
    ? csvContentId({
        occurredOn: row.occurredOn,
        amount: roundToScale(row.amount, row.currency),
        currency: row.currency,
        description: row.description.trim() || null,
        kind: row.kind,
      })
    : null;
}

export function exactLookupIds(
  externalIds: ReadonlyArray<string>,
  legacyIds: ReadonlyArray<string | null>,
): string[] {
  return [
    ...externalIds.map(csvExternalId),
    ...legacyIds.filter((id): id is string => id !== null),
  ];
}

export function exactMatchesOf(
  externalIds: ReadonlyArray<string>,
  legacyIds: ReadonlyArray<string | null>,
  taken: ReadonlyMap<string, string>,
): (ExactMatch | null)[] {
  return externalIds.map((id, index): ExactMatch | null => {
    const own = taken.get(csvExternalId(id));
    if (own) return { step: "external_id", transactionId: own };
    const legacy = legacyIds[index];
    const old = legacy ? taken.get(legacy) : undefined;
    return old ? { step: "legacy_hash", transactionId: old } : null;
  });
}

export function ladderRowsOf(
  rows: ReadonlyArray<CheckRow>,
  exact: ReadonlyArray<ExactMatch | null>,
): (LadderRow | null)[] {
  return rows.map((row, index) =>
    row.currency && isSupportedCurrency(row.currency) && !exact[index]
      ? { ...row, currency: row.currency }
      : null,
  );
}

export function exactTransactionIds(
  exact: ReadonlyArray<ExactMatch | null>,
): string[] {
  return exact.flatMap((match) => (match ? [match.transactionId] : []));
}

export function usedTransactionIds(
  claimed: ReadonlyArray<string>,
  exact: ReadonlyArray<ExactMatch | null>,
): Set<string> {
  return new Set([...claimed, ...exactTransactionIds(exact)]);
}

export function candidatesByRow(
  ladderRows: ReadonlyArray<LadderRow | null>,
  found: ReadonlyArray<FlowCandidate[]>,
  used: ReadonlySet<string>,
): FlowCandidate[][] {
  const candidates = ladderRows.map(() => [] as FlowCandidate[]);
  let next = 0;
  ladderRows.forEach((row, index) => {
    if (!row) return;
    candidates[index] = found[next++].filter((c) => !used.has(c.id));
  });
  return candidates;
}

export function checksOf(
  externalIds: ReadonlyArray<string>,
  exact: ReadonlyArray<ExactMatch | null>,
  judged: ReadonlyArray<LadderMatch | null>,
): SheetRowCheck[] {
  return externalIds.map((externalId, index) => {
    const exactStep = exact[index]?.step ?? null;
    const match = judged[index];
    return {
      externalId,
      state: exactStep ? "already_imported" : match ? "duplicate" : "new",
      step: exactStep ?? match?.step ?? null,
      match: match ? candidateMatchOf(match.candidate) : null,
    };
  });
}
