"use client";

import { ClipboardIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FilePicker({
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
