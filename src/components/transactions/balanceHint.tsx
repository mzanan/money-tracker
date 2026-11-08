export function BalanceHint({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground mt-1 text-xs tabular-nums">{text}</p>
  );
}
