"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  Trash2Icon,
} from "lucide-react";

import { CURRENCIES } from "@/lib/constants/currencies";
import { labelForSource } from "@/lib/constants/sources";
import type { CandidateMatch, EditableItem } from "@/lib/imageExtract";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { ErrorText } from "@/components/ui/errorText";
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

import { DuplicateCandidates } from "./duplicateCandidates";

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code);

export function DetectedItemCard({
  index,
  item,
  candidates,
  sourceOptions,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  item: EditableItem;
  candidates: CandidateMatch[];
  sourceOptions: string[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<EditableItem>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <Surface
      radius="lg"
      padding="md"
      className={item.selected ? "" : "opacity-50"}
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
              <p className="text-foreground mt-1 text-sm font-medium break-words">
                {item.description}
              </p>
            )}
            {item.collapsed && (
              <p className="text-muted-foreground mt-1 text-xs">
                {item.amount} {item.currency} ·{" "}
                {item.source ? (
                  labelForSource(item.source)
                ) : (
                  <span className="text-warning">no source</span>
                )}{" "}
                · {item.occurredOn ?? "today"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label="Move item up"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label="Move item down"
            >
              <ArrowDownIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange({ collapsed: !item.collapsed })}
              aria-label={item.collapsed ? "Expand item" : "Collapse item"}
            >
              <ChevronDownIcon
                className={`size-4 transition-transform ${item.collapsed ? "" : "rotate-180"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              aria-label="Remove item"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>

        {!item.collapsed && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Type">
                <Select
                  value={item.kind}
                  onValueChange={(v) =>
                    onChange({ kind: v as "income" | "expense" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Amount">
                <Input
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(e) => onChange({ amount: e.target.value })}
                />
              </Field>

              <Field label="Currency">
                <CurrencySelect
                  value={item.currency}
                  onValueChange={(v) => onChange({ currency: v })}
                  currencies={CURRENCY_CODES}
                />
              </Field>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Source">
                <SourcePicker
                  source={item.source}
                  sourceOptions={sourceOptions}
                  onChange={(source) => onChange({ source })}
                />
              </Field>

              <Field label="Date (empty = today)">
                <Input
                  type="date"
                  value={item.occurredOn ?? ""}
                  onChange={(e) =>
                    onChange({ occurredOn: e.target.value || null })
                  }
                />
              </Field>

              <Field label="Description">
                <Input
                  value={item.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}

        {item.error && <ErrorText>{item.error}</ErrorText>}

        {!item.collapsed && candidates.length > 0 && (
          <DuplicateCandidates
            candidates={candidates}
            item={item}
            onChange={onChange}
          />
        )}
      </div>
    </Surface>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const NEW_SOURCE = "__new__";

function SourcePicker({
  source,
  sourceOptions,
  onChange,
}: {
  source: string;
  sourceOptions: string[];
  onChange: (source: string) => void;
}) {
  const known = sourceOptions.includes(source);
  const [creating, setCreating] = useState(source !== "" && !known);

  function handleSelect(value: string) {
    if (value === NEW_SOURCE) {
      setCreating(true);
      onChange("");
      return;
    }
    setCreating(false);
    onChange(value);
  }

  return (
    <div className="grid gap-1">
      <Select
        value={creating ? NEW_SOURCE : source || undefined}
        onValueChange={handleSelect}
      >
        <SelectTrigger aria-invalid={(!creating && source === "") || undefined}>
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          {sourceOptions.map((value) => (
            <SelectItem key={value} value={value}>
              {labelForSource(value)}
            </SelectItem>
          ))}
          <SelectItem value={NEW_SOURCE}>New source...</SelectItem>
        </SelectContent>
      </Select>
      {creating && (
        <Input
          placeholder="Source name"
          value={source}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={source.trim() === "" || undefined}
        />
      )}
    </div>
  );
}
