import { ESTIMATE_PREFIX } from "@/lib/transactionDisplay";
import { cn } from "@/lib/utils";

export function RateEstimate({
  value,
  stale = false,
  emphasis = false,
  showRate = true,
  variant = "inline",
  className,
}: {
  value: string;
  stale?: boolean;
  emphasis?: boolean;
  showRate?: boolean;
  variant?: "inline" | "hint";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        variant === "hint" && "text-muted-foreground text-xs",
        className,
      )}
    >
      {ESTIMATE_PREFIX}
      <span className={cn(emphasis && "text-foreground")}>{value}</span>
      {showRate && (
        <>
          {" "}
          <span className="opacity-60">
            {stale ? "last known rate" : "today's rate"}
          </span>
        </>
      )}
    </span>
  );
}
