"use client";

import { Loader2Icon, SlidersHorizontalIcon } from "lucide-react";

import { CURRENCY_CODES } from "@/lib/constants/currencies";
import { CURRENCY_MAP_OPTIONS } from "@/lib/sheetImport/corrections";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { ErrorText } from "@/components/ui/errorText";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeledSelect";
import { Reveal } from "@/components/ui/reveal";

import { AccountNamePicker } from "../csv/accountNamePicker";
import { FileHeader } from "../csv/fileHeader";
import type { useSheetImport } from "../useSheetImport";
import { NotReadList } from "./notReadList";
import { ReadingCorrections } from "./readingCorrections";
import { SheetPreviewTable } from "./sheetPreviewTable";

export function SheetReview({
  sheet,
  existingSources,
}: {
  sheet: ReturnType<typeof useSheetImport>;
  existingSources: string[];
}) {
  return (
    <>
      <FileHeader
        fileName={sheet.fileName}
        rowCount={sheet.rows.length}
        pending={sheet.pending}
        onReset={sheet.reset}
      />

      {sheet.warnings.map((warning) => (
        <p key={warning} className="text-muted-foreground text-caption">
          {warning}
        </p>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <AccountNamePicker
          value={sheet.source}
          onChange={sheet.changeSource}
          existingSources={existingSources}
        />
        {sheet.unknownCurrencies.map((raw) => (
          <LabeledSelect
            key={raw}
            label={`Currency written as "${raw}"`}
            value={sheet.currencyMap[raw] ?? ""}
            options={CURRENCY_MAP_OPTIONS}
            onChange={(code) => sheet.mapCurrency(raw, code)}
            placeholder="Pick a currency"
          />
        ))}
        {sheet.missingCurrency > 0 && (
          <div className="grid gap-1.5">
            <Label>
              Currency <span className="text-destructive">*</span>
            </Label>
            <CurrencySelect
              value={sheet.currency || undefined}
              onValueChange={sheet.changeCurrency}
              currencies={[...CURRENCY_CODES]}
              showName
              placeholder="Pick a currency"
            />
            <p className="text-muted-foreground text-caption">
              {sheet.missingCurrency} rows have no currency in the file.
            </p>
          </div>
        )}
      </div>

      {sheet.recipe && (
        <div className="grid gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => sheet.setShowCorrections(!sheet.showCorrections)}
          >
            <SlidersHorizontalIcon className="size-4" />
            {sheet.showCorrections ? "Hide the reading" : "Fix the reading"}
          </Button>
          <Reveal open={sheet.showCorrections}>
            <ReadingCorrections
              recipe={sheet.recipe}
              grids={sheet.grids}
              onChange={sheet.updateTable}
            />
          </Reveal>
        </div>
      )}

      {sheet.applied && (
        <NotReadList
          errors={sheet.notRead}
          skippedCount={sheet.applied.skipped.length}
        />
      )}

      <SheetPreviewTable
        rows={sheet.rows}
        checks={sheet.checks}
        excluded={sheet.excluded}
        currency={sheet.currency}
        currencyMap={sheet.currencyMap}
        onToggle={sheet.toggleRow}
      />

      {sheet.checkError && <ErrorText>{sheet.checkError}</ErrorText>}

      <div className="flex gap-2">
        <Button
          onClick={sheet.submit}
          disabled={!sheet.canSubmit || sheet.pending}
          className="flex-1"
        >
          {(sheet.pending || (!sheet.checks && sheet.rows.length > 0)) && (
            <Loader2Icon className="animate-spin" />
          )}
          Import {sheet.selectedCount} transactions
        </Button>
        <Button
          variant="ghost"
          className="shrink-0"
          onClick={sheet.reset}
          disabled={sheet.pending}
        >
          Cancel
        </Button>
      </div>
    </>
  );
}
