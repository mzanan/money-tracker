"use client";

import { ClipboardIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";

import { CURRENCIES } from "@/config/currencies";
import { useCsvImport } from "@/hooks/useCsvImport";
import type { CsvRow } from "@/lib/actions/csvImport";
import type { DateFormat, SignConvention } from "@/lib/csvPresets";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CsvImportCard() {
  const csv = useCsvImport();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import or paste CSV</CardTitle>
        <CardDescription>
          Upload or paste a statement from any bank or wallet (Wise, Astropay,
          etc.). You label the source — re-importing the same data does not
          duplicate.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!csv.fileName ? (
          <FilePicker
            mode={csv.mode}
            pasted={csv.pasted}
            inputRef={csv.inputRef}
            onModeChange={csv.setMode}
            onPastedChange={csv.setPasted}
            onFile={csv.handleFile}
            onPaste={csv.handlePaste}
          />
        ) : (
          <>
            <FileHeader
              fileName={csv.fileName}
              rowCount={csv.rawRows.length}
              pending={csv.pending}
              onReset={csv.reset}
            />

            <MappingForm csv={csv} />

            {csv.previewRows.length > 0 && (
              <PreviewTable
                rows={csv.previewRows}
                okCount={csv.totalNormalized.ok}
                cutoffCount={csv.totalNormalized.cutoff}
              />
            )}

            <div className="flex gap-2">
              <Button
                onClick={csv.submit}
                disabled={!csv.canSubmit || csv.pending}
                className="flex-1"
              >
                {csv.pending && <Loader2Icon className="animate-spin" />}
                Import {csv.totalNormalized.ok} transactions
              </Button>
              <Button
                variant="ghost"
                onClick={csv.reset}
                disabled={csv.pending}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FilePicker({
  mode,
  pasted,
  inputRef,
  onModeChange,
  onPastedChange,
  onFile,
  onPaste,
}: {
  mode: "file" | "paste";
  pasted: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onModeChange: (mode: "file" | "paste") => void;
  onPastedChange: (value: string) => void;
  onFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: () => void;
}) {
  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        className="hidden"
        id="csv-file"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => {
            onModeChange("file");
            inputRef.current?.click();
          }}
        >
          <UploadIcon /> Upload file
        </Button>
        <Button
          size="sm"
          variant={mode === "paste" ? "default" : "outline"}
          onClick={() => onModeChange("paste")}
        >
          <ClipboardIcon /> Paste
        </Button>
      </div>

      {mode === "paste" && (
        <div className="grid gap-2">
          <Textarea
            value={pasted}
            onChange={(event) => onPastedChange(event.target.value)}
            placeholder={
              "date,amount,currency,description\n2026-05-18,-12.50,USD,Coffee"
            }
            rows={8}
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={onPaste} className="w-fit">
            Parse pasted CSV
          </Button>
        </div>
      )}
    </div>
  );
}

function FileHeader({
  fileName,
  rowCount,
  pending,
  onReset,
}: {
  fileName: string;
  rowCount: number;
  pending: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-muted-foreground text-xs">
          {rowCount} rows detected
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={pending}
      >
        <XIcon className="size-4" />
        Start over
      </Button>
    </div>
  );
}

function MappingForm({ csv }: { csv: ReturnType<typeof useCsvImport> }) {
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

      <div className="grid gap-1.5">
        <Label>
          Account name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="wise / wise-personal / astropay"
          required
        />
        <p className="text-muted-foreground text-[11px]">
          Groups these rows in the home filter. Re-importing under the same
          name will not duplicate.
        </p>
      </div>

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
              onChange={(v) =>
                setMapping((m) => ({ ...m, directionCol: v }))
              }
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
    </div>
  );
}

function HeaderSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick column" />
        </SelectTrigger>
        <SelectContent>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionalHeaderSelect({
  label,
  value,
  headers,
  onChange,
  className,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Select
        value={value || "__none"}
        onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PreviewTable({
  rows,
  okCount,
  cutoffCount,
}: {
  rows: Array<{ raw: Record<string, string>; normalized: CsvRow }>;
  okCount: number;
  cutoffCount: number;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">
        Preview ({okCount} to import
        {cutoffCount > 0 ? ` · ${cutoffCount} before cutoff` : ""})
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">Date</th>
              <th className="px-2 py-1.5 text-left">Kind</th>
              <th className="px-2 py-1.5 text-right">Amount</th>
              <th className="px-2 py-1.5 text-left">Currency</th>
              <th className="px-2 py-1.5 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5">{p.normalized.occurredOn}</td>
                <td className="px-2 py-1.5">{p.normalized.kind}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {p.normalized.amount}
                </td>
                <td className="px-2 py-1.5">{p.normalized.currency}</td>
                <td className="max-w-xs truncate px-2 py-1.5">
                  {p.normalized.description ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
