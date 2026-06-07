"use client";

import { AlertTriangleIcon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";

import type { CandidateMatch } from "@/hooks/useScreenshotImport";

export function CandidateBlock({
  candidates,
}: {
  candidates: CandidateMatch[];
}) {
  return (
    <div className="bg-muted/40 grid gap-1.5 rounded-lg p-2.5 text-xs">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <AlertTriangleIcon className="size-3.5" />
        <span className="font-medium">
          Possible duplicate{candidates.length > 1 ? "s" : ""}:
        </span>
      </div>
      {candidates.map((match) => (
        <div
          key={match.id}
          className="text-foreground flex justify-between gap-2"
        >
          <span>
            {labelForSource(match.source)} · {match.occurredOn}
            {match.note ? ` · ${match.note}` : ""}
          </span>
          <span className="font-mono">
            {match.kind === "expense" ? "-" : "+"}
            {match.amount} {match.currency}
          </span>
        </div>
      ))}
      <p className="text-muted-foreground">
        Uncheck this item if it’s the same payment.
      </p>
    </div>
  );
}
