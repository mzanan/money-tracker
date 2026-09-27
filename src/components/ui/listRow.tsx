import type { ReactNode } from "react";

export function ListRow({
  title,
  badge,
  meta,
  leading,
  children,
}: {
  title: string;
  badge?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {badge}
        </div>
        {meta != null && (
          <p className="text-muted-foreground mt-0.5 text-xs">{meta}</p>
        )}
      </div>
      {children}
    </div>
  );
}
