import { ChevronRightIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function NoticeBanner({
  icon: Icon,
  title,
  detail,
  tone = "primary",
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone?: "primary" | "destructive";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-card flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        tone === "destructive"
          ? "bg-destructive/10 hover:bg-destructive/15"
          : "bg-primary/10 hover:bg-primary/15",
      )}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          tone === "destructive" ? "text-destructive" : "text-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground truncate text-xs">{detail}</p>
      </div>
      <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}
