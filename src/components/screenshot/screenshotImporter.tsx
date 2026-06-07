"use client";

import { useRef } from "react";
import {
  AlertTriangleIcon,
  ImageUpIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";

import { CURRENCIES } from "@/config/currencies";
import {
  useScreenshotImport,
  type CandidateMatch,
  type EditableItem,
} from "@/hooks/useScreenshotImport";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { labelForSource } from "@/lib/constants/sources";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";

interface Props {
  initialItems: DetectedTransaction[] | null;
  initialIgnored: number;
  initialCandidates: Record<number, CandidateMatch[]>;
}

export function ScreenshotImporter({
  initialItems,
  initialIgnored,
  initialCandidates,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    ignored,
    candidatesByIndex,
    extracting,
    pending,
    canSubmit,
    selectedCount,
    processFile,
    updateItem,
    removeItem,
    submit,
    reset,
  } = useScreenshotImport({ initialItems, initialIgnored, initialCandidates });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="screenshot-file"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openPicker} disabled={extracting}>
              {extracting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <ImageUpIcon />
              )}
              {items.length > 0 ? "Use another screenshot" : "Upload screenshot"}
            </Button>
            {items.length > 0 && (
              <Button
                variant="ghost"
                onClick={reset}
                disabled={extracting || pending}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            PNG / JPEG / WebP. On Android with the app installed, share any
            screenshot to Money Tracker from the share sheet — same flow.
          </p>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          {ignored > 0 && (
            <p className="text-muted-foreground text-xs">
              {ignored} non-financial notification(s) skipped.
            </p>
          )}

          <ul className="grid gap-3">
            {items.map((item, index) => (
              <DetectedItemCard
                key={index}
                index={index}
                item={item}
                candidates={candidatesByIndex[index] ?? []}
                onChange={(patch) => updateItem(index, patch)}
                onRemove={() => removeItem(index)}
              />
            ))}
          </ul>

          <div className="bg-card sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              {selectedCount}/{items.length} selected
            </p>
            <Button onClick={submit} disabled={!canSubmit || pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Import {selectedCount}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function DetectedItemCard({
  index,
  item,
  candidates,
  onChange,
  onRemove,
}: {
  index: number;
  item: EditableItem;
  candidates: CandidateMatch[];
  onChange: (patch: Partial<EditableItem>) => void;
  onRemove: () => void;
}) {
  return (
    <Surface
      className={item.selected ? "" : "opacity-50"}
      padding="md"
    >
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(e) => onChange({ selected: e.target.checked })}
            className="mt-1 size-4"
            aria-label={`Select item ${index + 1}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={item.kind === "income" ? "secondary" : "outline"}
                size="xs"
              >
                {item.kind}
              </Badge>
              {item.app && (
                <Badge variant="outline" size="xs">
                  {item.app}
                </Badge>
              )}
              {item.confidence !== "high" && (
                <Badge variant="outline" size="xs">
                  {item.confidence} confidence
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-foreground mt-1 text-sm font-medium">
                {item.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <FieldKind value={item.kind} onChange={(v) => onChange({ kind: v })} />
          <FieldAmount
            value={item.amount}
            onChange={(v) => onChange({ amount: v })}
          />
          <FieldCurrency
            value={item.currency}
            onChange={(v) => onChange({ currency: v })}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <FieldDate
            value={item.occurredOn}
            onChange={(v) => onChange({ occurredOn: v })}
          />
          <FieldDescription
            value={item.description}
            onChange={(v) => onChange({ description: v })}
          />
        </div>

        <FieldComment
          value={item.comment}
          onChange={(v) => onChange({ comment: v })}
        />

        {candidates.length > 0 && (
          <CandidateBlock candidates={candidates} />
        )}
      </div>
    </Surface>
  );
}

function FieldKind({
  value,
  onChange,
}: {
  value: "income" | "expense";
  onChange: (v: "income" | "expense") => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Type</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as "income" | "expense")}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="income">Income</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldAmount({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Amount</Label>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldCurrency({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Currency</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldDate({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Date (empty = today)</Label>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}

function FieldDescription({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Description</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldComment({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">Your note (optional)</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a personal comment"
      />
    </div>
  );
}

function CandidateBlock({ candidates }: { candidates: CandidateMatch[] }) {
  return (
    <div className="bg-muted/40 grid gap-1.5 rounded-lg p-2.5 text-xs">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <AlertTriangleIcon className="size-3.5" />
        <span className="font-medium">
          Possible duplicate
          {candidates.length > 1 ? "s" : ""}:
        </span>
      </div>
      {candidates.map((m) => (
        <div key={m.id} className="text-foreground flex justify-between gap-2">
          <span>
            {labelForSource(m.source)} · {m.occurredOn}
            {m.note ? ` · ${m.note}` : ""}
          </span>
          <span className="font-mono">
            {m.kind === "expense" ? "-" : "+"}
            {m.amount} {m.currency}
          </span>
        </div>
      ))}
      <p className="text-muted-foreground">
        Uncheck this item if it’s the same payment.
      </p>
    </div>
  );
}
