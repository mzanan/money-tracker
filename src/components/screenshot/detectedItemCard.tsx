"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { CURRENCIES } from "@/config/currencies";
import { labelForSource, SOURCE_LABELS } from "@/lib/constants/sources";

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

import type {
  CandidateMatch,
  EditableItem,
} from "@/hooks/useScreenshotImport";

import { CandidateBlock } from "./candidateBlock";

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code);

export function DetectedItemCard({
  index,
  item,
  candidates,
  customSources,
  onChange,
  onRemove,
}: {
  index: number;
  item: EditableItem;
  candidates: CandidateMatch[];
  customSources: string[];
  onChange: (patch: Partial<EditableItem>) => void;
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
              customSources={customSources}
              onChange={(source) => onChange({ source })}
            />
          </Field>

          <Field label="Date (empty = today)">
            <Input
              type="date"
              value={item.occurredOn ?? ""}
              onChange={(e) => onChange({ occurredOn: e.target.value || null })}
            />
          </Field>

          <Field label="Description">
            <Input
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>
        </div>

        {item.error && <ErrorText>{item.error}</ErrorText>}

        {candidates.length > 0 && (
          <CandidateBlock
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
  customSources,
  onChange,
}: {
  source: string;
  customSources: string[];
  onChange: (source: string) => void;
}) {
  const known = source in SOURCE_LABELS || customSources.includes(source);
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
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
          {customSources.map((value) => (
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
