import {
  type ReadingChoice,
  type ReadingConflict,
} from "@/lib/sheetImport/layout";
import { readingConflictText } from "@/lib/sheetImport/corrections";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export function ReadingConflicts({
  conflicts,
  choices,
  onChoose,
}: {
  conflicts: ReadingConflict[];
  choices: Readonly<Record<number, ReadingChoice>>;
  onChoose: (conflict: ReadingConflict, choice: ReadingChoice) => void;
}) {
  if (conflicts.length === 0) return null;
  return (
    <div className="grid gap-2">
      {conflicts.map((conflict) => (
        <Surface
          key={conflict.table}
          tone="outline"
          padding="xs"
          className="grid gap-2"
        >
          <p className="text-sm">{readingConflictText(conflict)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={
                choices[conflict.table] === "fresh" ? "default" : "outline"
              }
              onClick={() => onChoose(conflict, "fresh")}
            >
              Use the new reading
            </Button>
            <Button
              size="sm"
              variant={
                choices[conflict.table] === "saved" ? "default" : "outline"
              }
              onClick={() => onChoose(conflict, "saved")}
            >
              Use the last reading
            </Button>
          </div>
        </Surface>
      ))}
    </div>
  );
}
