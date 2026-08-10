"use client";

import { CURRENCIES } from "@/lib/constants/currencies";
import type { useCsvImport } from "@/hooks/useCsvImport";
import type { DateFormat, SignConvention } from "@/lib/csvPresets";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AccountNamePicker } from "./accountNamePicker";
import { HeaderSelect } from "./headerSelect";
import { OptionalHeaderSelect } from "./optionalHeaderSelect";

export function MappingForm({
  csv,
  existingSources,
}: {
  csv: ReturnType<typeof useCsvImport>;
  existingSources: string[];
}) {
  const { mapping, headers, source, formatId, presets, setMapping, setSource } =
    csv;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Format</Label>
        <Select value={formatId} onValueChange={csv.handleFormatChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom (auto-detect)</SelectItem>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AccountNamePicker
        value={source}
        onChange={setSource}
        existingSources={existingSources}
      />

      <div className="grid gap-1.5">
        <Label>Import from (optional)</Label>
        <Input
          type="date"
          value={mapping.sinceDate}
          onChange={(event) =>
            setMapping((m) => ({ ...m, sinceDate: event.target.value }))
          }
        />
      </div>

      <HeaderSelect
        label="Date column"
        value={mapping.dateCol}
        headers={headers}
        onChange={(v) => setMapping((m) => ({ ...m, dateCol: v }))}
      />

      <div className="grid gap-1.5">
        <Label>Date format</Label>
        <Select
          value={mapping.dateFormat}
          onValueChange={(v: DateFormat) =>
            setMapping((m) => ({ ...m, dateFormat: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
            <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
            <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>Sign convention</Label>
        <Select
          value={mapping.signConvention}
          onValueChange={(v: SignConvention) =>
            setMapping((m) => ({ ...m, signConvention: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="signed-amount">
              Signed amount (− = expense)
            </SelectItem>
            <SelectItem value="debit-credit-cols">
              Debit / credit columns
            </SelectItem>
            <SelectItem value="direction-column">
              Direction column (IN / OUT)
            </SelectItem>
            <SelectItem value="all-expense">All expenses</SelectItem>
            <SelectItem value="all-income">All income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mapping.signConvention === "debit-credit-cols" ? (
        <>
          <HeaderSelect
            label="Debit column"
            value={mapping.debitCol}
            headers={headers}
            onChange={(v) => setMapping((m) => ({ ...m, debitCol: v }))}
          />
          <HeaderSelect
            label="Credit column"
            value={mapping.creditCol}
            headers={headers}
            onChange={(v) => setMapping((m) => ({ ...m, creditCol: v }))}
          />
        </>
      ) : (
        <>
          <HeaderSelect
            label="Amount column"
            value={mapping.amountCol}
            headers={headers}
            onChange={(v) => setMapping((m) => ({ ...m, amountCol: v }))}
          />
          {mapping.signConvention === "direction-column" && (
            <HeaderSelect
              label="Direction column"
              value={mapping.directionCol}
              headers={headers}
              onChange={(v) => setMapping((m) => ({ ...m, directionCol: v }))}
            />
          )}
        </>
      )}

      <div className="grid gap-1.5">
        <Label>Currency</Label>
        <Select
          value={mapping.currencyMode}
          onValueChange={(v: "column" | "fixed") =>
            setMapping((m) => ({ ...m, currencyMode: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Same for all rows</SelectItem>
            <SelectItem value="column">From column</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mapping.currencyMode === "fixed" ? (
        <div className="grid gap-1.5">
          <Label>Currency code</Label>
          <Select
            value={mapping.currencyFixed}
            onValueChange={(v) =>
              setMapping((m) => ({ ...m, currencyFixed: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <HeaderSelect
          label="Currency column"
          value={mapping.currencyCol}
          headers={headers}
          onChange={(v) => setMapping((m) => ({ ...m, currencyCol: v }))}
        />
      )}

      <OptionalHeaderSelect
        className="sm:col-span-2"
        label="Description column (optional)"
        value={mapping.descriptionCol}
        headers={headers}
        onChange={(v) => setMapping((m) => ({ ...m, descriptionCol: v }))}
      />

      <OptionalHeaderSelect
        className="sm:col-span-2"
        label="Status column (optional — skips cancelled / failed rows)"
        value={mapping.statusCol}
        headers={headers}
        onChange={(v) => setMapping((m) => ({ ...m, statusCol: v }))}
      />

      <OptionalHeaderSelect
        className="sm:col-span-2"
        label="Transaction ID column (optional — used as dedup identifier instead of content hash)"
        value={mapping.externalIdCol}
        headers={headers}
        onChange={(v) => setMapping((m) => ({ ...m, externalIdCol: v }))}
      />
    </div>
  );
}
