"use client";

import { useState } from "react";
import { Loader2Icon, SlidersHorizontalIcon } from "lucide-react";

import { useCsvImport } from "@/hooks/useCsvImport";
import { useInlineEdit } from "@/hooks/useInlineEdit";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { FileHeader } from "./csv/fileHeader";
import { FilePicker } from "./csv/filePicker";
import { MappingForm } from "./csv/mappingForm";
import { PreviewTable } from "./csv/previewTable";

export function CsvImportCard({
  existingSources = [],
}: {
  existingSources?: string[];
}) {
  const csv = useCsvImport();
  const [showMapping, setShowMapping] = useState(false);
  const sourceEdit = useInlineEdit(csv.setSource);

  const mappingVisible = showMapping || !csv.canSubmit;

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
      <CardContent className="flex flex-col gap-4">
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

            {mappingVisible ? (
              <MappingForm csv={csv} existingSources={existingSources} />
            ) : (
              <div className="bg-surface-2/60 flex items-center gap-2 rounded-xl px-3 py-2">
                <div className="text-muted-foreground min-w-0 flex-1 text-sm">
                  {sourceEdit.editing ? (
                    <Input
                      {...sourceEdit.inputProps}
                      onBlur={sourceEdit.submit}
                      placeholder="wise / astropay"
                      className="h-7 text-sm"
                    />
                  ) : (
                    <p className="truncate">
                      <button
                        type="button"
                        onClick={() => sourceEdit.start(csv.source)}
                        className="text-foreground decoration-muted-foreground/50 hover:text-primary font-medium underline decoration-dotted underline-offset-2"
                        title="Click to rename this account"
                      >
                        {csv.source || "untitled"}
                      </button>{" "}
                      · {csv.totalNormalized.ok} ready to import
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowMapping(true)}
                >
                  <SlidersHorizontalIcon className="size-4" />
                  Adjust columns
                </Button>
              </div>
            )}

            {mappingVisible && csv.previewRows.length > 0 && (
              <PreviewTable
                rows={csv.previewRows}
                okCount={csv.totalNormalized.ok}
                cutoffCount={csv.totalNormalized.cutoff}
              />
            )}

            <label className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
              <Switch
                checked={csv.replace}
                onCheckedChange={csv.setReplace}
                disabled={csv.pending}
                className="mt-0.5"
              />
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">
                  Replace previously imported rows in this source
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Deletes only CSV-imported transactions under &quot;
                  {csv.source || "this source"}&quot; before importing. Manual
                  entries and screenshot imports are kept.
                </span>
              </div>
            </label>

            <div className="flex gap-2">
              <Button
                onClick={csv.submit}
                disabled={!csv.canSubmit || csv.pending}
                className="flex-1"
              >
                {csv.pending && <Loader2Icon className="animate-spin" />}
                {csv.replace ? "Replace" : "Import"} {csv.totalNormalized.ok}{" "}
                transactions
              </Button>
              <Button
                variant="ghost"
                className="shrink-0"
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
