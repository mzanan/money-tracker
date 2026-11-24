"use client";

import { Loader2Icon } from "lucide-react";

import { SHEET_FILE_ACCEPT } from "@/lib/sheetImport/corrections";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorText } from "@/components/ui/errorText";

import { CsvImportCard } from "./csvImportCard";
import { FilePicker } from "./csv/filePicker";
import { SheetReview } from "./sheet/sheetReview";
import { useSheetImport } from "./useSheetImport";

export function SheetImportCard({
  existingSources = [],
}: {
  existingSources?: string[];
}) {
  const sheet = useSheetImport();

  if (sheet.presetFile) {
    return (
      <CsvImportCard
        existingSources={existingSources}
        initial={sheet.presetFile}
        onReset={sheet.reset}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import a spreadsheet or CSV</CardTitle>
        <CardDescription>
          Excel, Google Sheets (File, Download, .xlsx), LibreOffice, Numbers or
          CSV, built any way. AI reads the layout once; you check every row
          before importing. Re-importing the same file does not duplicate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sheet.phase === "idle" && (
          <>
            <FilePicker
              accept={SHEET_FILE_ACCEPT}
              pastePlaceholder={
                "Date\tDescription\tAmount\n18/05/2026\tCoffee\t-12,50"
              }
              pasteLabel="Read pasted data"
              mode={sheet.mode}
              pasted={sheet.pasted}
              inputRef={sheet.inputRef}
              onModeChange={sheet.setMode}
              onPastedChange={sheet.setPasted}
              onFile={sheet.handleFile}
              onPaste={sheet.handlePaste}
            />
            {sheet.error && <ErrorText>{sheet.error}</ErrorText>}
          </>
        )}
        {sheet.phase === "reading" && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Reading {sheet.fileName}
          </p>
        )}
        {sheet.phase === "ready" && (
          <SheetReview sheet={sheet} existingSources={existingSources} />
        )}
      </CardContent>
    </Card>
  );
}
