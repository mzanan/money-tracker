import Link from "next/link";

interface BrandProps {
  href?: string;
  showBeta?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function Brand({ href = "/", showBeta = true, onClick }: BrandProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 tracking-tight"
    >
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-[12px] font-bold"
      >
        m
      </span>
      <span className="text-base font-semibold">Money</span>
      {showBeta ? (
        <span className="text-muted-foreground text-xs font-medium">beta</span>
      ) : null}
    </Link>
  );
}
