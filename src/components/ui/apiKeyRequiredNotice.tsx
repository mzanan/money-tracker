import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ApiKeyRequiredNotice({
  feature,
  className,
}: {
  feature: string;
  className?: string;
}) {
  return (
    <Link
      href="/settings"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        className,
      )}
    >
      <KeyRoundIcon className="size-3.5 shrink-0" />
      {feature} runs on your own AI key. Add it in Settings.
    </Link>
  );
}
