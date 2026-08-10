import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const tappableRowVariants = cva(
  "hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl transition-colors",
  {
    variants: {
      bordered: {
        true: "border-border border px-4 py-3",
        false: "px-3 py-3",
      },
      justify: {
        start: "",
        between: "justify-between",
      },
    },
    defaultVariants: {
      bordered: false,
      justify: "start",
    },
  },
);

type TappableRowElement = "button" | "div" | "li";

type TappableRowProps<T extends TappableRowElement> = Omit<
  React.ComponentPropsWithoutRef<T>,
  "className"
> &
  VariantProps<typeof tappableRowVariants> & {
    as?: T;
    className?: string;
  };

export function TappableRow<T extends TappableRowElement = "button">({
  as,
  bordered,
  justify,
  className,
  ...props
}: TappableRowProps<T>) {
  const Component = (as ?? "button") as React.ElementType;

  return (
    <Component
      className={cn(
        tappableRowVariants({ bordered, justify }),
        Component === "button" && "text-left",
        className,
      )}
      {...props}
    />
  );
}
