import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 tracking-tight">
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-[12px] font-bold"
      >
        m
      </span>
      <span className="text-base font-semibold">Money</span>
      <span className="text-muted-foreground text-xs font-medium">beta</span>
    </Link>
  );
}
