"use client";

import { useState } from "react";

import { kindOfSource, labelForSource } from "@/lib/constants/sources";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function validateAccountName(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  if (n === "manual") return "Reserved — used by Cash";
  if (kindOfSource(n) === "api") {
    return `Reserved for ${labelForSource(n)} sync`;
  }
  return null;
}

export function AccountNamePicker({
  value,
  onChange,
  existingSources,
}: {
  value: string;
  onChange: (value: string) => void;
  existingSources: string[];
}) {
  const matchesExisting = existingSources.includes(value.trim().toLowerCase());
  const [customMode, setCustomMode] = useState(
    !matchesExisting && existingSources.length > 0,
  );
  const error = validateAccountName(value);
  const hasOptions = existingSources.length > 0;
  const showInput = !hasOptions || customMode || !matchesExisting;

  return (
    <div className="grid gap-1.5">
      <Label>
        Account name <span className="text-destructive">*</span>
      </Label>
      {hasOptions && (
        <Select
          value={
            customMode || !matchesExisting
              ? "__new"
              : value.trim().toLowerCase()
          }
          onValueChange={(v) => {
            if (v === "__new") {
              setCustomMode(true);
              onChange("");
            } else {
              setCustomMode(false);
              onChange(v);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick or create" />
          </SelectTrigger>
          <SelectContent>
            {existingSources.map((s) => (
              <SelectItem key={s} value={s}>
                {labelForSource(s)}
              </SelectItem>
            ))}
            <SelectItem value="__new">+ New account</SelectItem>
          </SelectContent>
        </Select>
      )}
      {showInput && (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="wise / wise-personal / astropay"
          required
          aria-invalid={error ? true : undefined}
        />
      )}
      {error && <p className="text-destructive text-[11px]">{error}</p>}
      <p className="text-muted-foreground text-[11px]">
        Groups these rows in the home filter. Re-importing under the same name
        will not duplicate.
      </p>
    </div>
  );
}
