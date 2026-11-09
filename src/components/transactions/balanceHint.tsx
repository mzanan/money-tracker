import { ChevronRightIcon } from "lucide-react";

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
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground relative mt-1 inline-flex items-center gap-0.5 text-left text-xs tabular-nums transition-colors after:absolute after:-inset-x-2 after:-top-1 after:-bottom-6"
    >
      {text}
      <ChevronRightIcon className="size-3.5 shrink-0" />
    </button>
  );
}
