import { ChevronRightIcon } from "lucide-react";

import { TextAction } from "@/components/ui/textAction";

export function BalanceHint({
  text,
  onClick,
}: {
  text: string;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <p className="text-muted-foreground mt-1 text-xs tabular-nums">{text}</p>
    );
  }
  return (
    <TextAction
      size="xs"
      onClick={onClick}
      className="relative mt-1 gap-0.5 text-left font-normal tabular-nums after:absolute after:-inset-x-2 after:-top-1 after:-bottom-6"
    >
      {text}
      <ChevronRightIcon className="size-3.5 shrink-0" />
    </TextAction>
  );
}
