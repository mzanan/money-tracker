import { issueLabel, MAX_LISTED_ISSUES } from "@/lib/sheetImport/corrections";
import type { SheetRowIssue } from "@/lib/sheetImport/apply";

import { ErrorText } from "@/components/ui/errorText";

export function NotReadList({
  errors,
  skippedCount,
}: {
  errors: SheetRowIssue[];
  skippedCount: number;
}) {
  if (!errors.length && !skippedCount) return null;
  return (
    <div className="grid gap-1">
      {errors.length > 0 && (
        <>
          <ErrorText className="text-sm font-medium">
            {errors.length} rows could not be read and will not be imported
          </ErrorText>
          <ul className="text-muted-foreground text-caption grid gap-0.5">
            {errors.slice(0, MAX_LISTED_ISSUES).map((issue) => (
              <li key={`${issue.sheet}-${issue.row}-${issue.reason}`}>
                {issueLabel(issue)}
              </li>
            ))}
            {errors.length > MAX_LISTED_ISSUES && (
              <li>and {errors.length - MAX_LISTED_ISSUES} more</li>
            )}
          </ul>
        </>
      )}
      {skippedCount > 0 && (
        <p className="text-muted-foreground text-caption">
          {skippedCount} totals, headers or summary tabs skipped.
        </p>
      )}
    </div>
  );
}
