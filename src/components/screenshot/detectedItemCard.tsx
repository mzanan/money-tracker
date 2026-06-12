"use client";

import { Trash2Icon } from "lucide-react";

import { CURRENCIES } from "@/config/currencies";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
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

        <div className="grid gap-2 sm:grid-cols-2">
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

        <Field label="Your note (optional)">
          <Input
            value={item.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
            placeholder="Add a personal comment"
          />
        </Field>

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
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
