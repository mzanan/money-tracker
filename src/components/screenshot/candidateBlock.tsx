"use client";

import { AlertTriangleIcon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";
import { cn } from "@/lib/utils";

import type { CandidateMatch, EditableItem } from "@/hooks/useScreenshotImport";

export function CandidateBlock({
  candidates,
  item,
  onChange,
}: {
  candidates: CandidateMatch[];
  item: EditableItem;
  onChange: (patch: Partial<EditableItem>) => void;
}) {
  const keepingExisting = !item.selected;
  const keepingBoth = item.selected && item.replaceId === null;

  return (
    <div className="bg-muted/40 grid gap-1.5 rounded-lg p-2.5 text-xs">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <AlertTriangleIcon className="size-3.5" />
        <span className="font-medium">
          Possible duplicate{candidates.length > 1 ? "s" : ""}:
        </span>
      </div>
      {candidates.map((match) => (
        <div key={match.id} className="grid gap-1">
          <div className="text-foreground flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {labelForSource(match.source)} · {match.occurredOn}
              {match.note ? ` · ${match.note}` : ""}
            </span>
            <span className="shrink-0 font-mono">
              {match.kind === "expense" ? "-" : "+"}
              {match.amount} {match.currency}
            </span>
          </div>
          <ChoiceButton
            active={item.replaceId === match.id}
            onClick={() => onChange({ selected: true, replaceId: match.id })}
          >
            Replace it with this import
          </ChoiceButton>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap gap-1.5">
        <ChoiceButton
          active={keepingExisting}
          onClick={() => onChange({ selected: false, replaceId: null })}
        >
          Keep existing, skip this
        </ChoiceButton>
        <ChoiceButton
          active={keepingBoth}
          onClick={() => onChange({ selected: true, replaceId: null })}
        >
          Keep both
        </ChoiceButton>
      </div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-fit rounded-full border px-2.5 py-1 font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
