import { cn } from "@/lib/utils";

export function Ticker({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-block h-[1lh] overflow-hidden", className)}>
      <span className="animate-ticker flex flex-col motion-reduce:animate-none">
        {items.map((item) => (
          <span key={item} className="h-[1lh]">
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}
