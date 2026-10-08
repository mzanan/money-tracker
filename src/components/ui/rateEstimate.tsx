import { cn } from "@/lib/utils";

export function RateEstimate({
  value,
  stale = false,
  emphasis = false,
  className,
}: {
  value: string;
  stale?: boolean;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      ≈ <span className={cn(emphasis && "text-foreground")}>{value}</span>{" "}
      <span className="opacity-60">
        {stale ? "last known rate" : "today's rate"}
      </span>
    </span>
  );
}
