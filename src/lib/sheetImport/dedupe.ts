import type { DuplicateStep } from "@/lib/constants/sheetImport";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import type { FlowCandidate } from "@/lib/ledger/candidates";
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

function dayGap(a: string, b: string): number {
  return Math.round(
    Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
      86_400_000,
  );
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
        dayGap: dayGap(row.occurredOn, candidate.occurredOn),
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
