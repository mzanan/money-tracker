import type { CSSProperties, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconCircleVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      tone: {
        none: "",
        neutral: "bg-surface-2 text-foreground",
        muted: "bg-surface-2 text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        destructive: "bg-destructive/10 text-destructive",
        income: "bg-income text-income",
        expense: "bg-expense text-expense",
      },
      size: {
        xs: "size-8",
        sm: "size-9",
        default: "size-10",
        lg: "size-12",
      },
    },
    defaultVariants: {
      tone: "none",
      size: "default",
    },
  },
);

export function IconCircle({
  tone,
  size,
  className,
  children,
  style,
}: VariantProps<typeof iconCircleVariants> & {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(iconCircleVariants({ tone, size }), className)}
    >
      {children}
    </span>
  );
}
