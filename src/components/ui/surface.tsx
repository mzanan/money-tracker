import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const surfaceVariants = cva("bg-card", {
  variants: {
    radius: {
      lg: "rounded-2xl",
      xl: "rounded-3xl",
    },
    padding: {
      none: "",
      list: "px-1 py-1",
      sm: "px-4 py-4",
      md: "px-5 py-5",
      lg: "px-6 py-6",
    },
  },
  defaultVariants: {
    radius: "xl",
    padding: "md",
  },
});

function Surface({
  className,
  radius,
  padding,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="surface"
      className={cn(surfaceVariants({ radius, padding }), className)}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
