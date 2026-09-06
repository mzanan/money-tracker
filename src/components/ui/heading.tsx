import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const headingVariants = cva("font-semibold tracking-tight", {
  variants: {
    size: {
      display: "text-5xl text-balance sm:text-7xl",
      section: "text-xl",
    },
  },
  defaultVariants: {
    size: "section",
  },
});

function Heading({
  className,
  size,
  as: Comp = "h2",
  ...props
}: React.ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3";
  }) {
  return (
    <Comp
      data-slot="heading"
      className={cn(headingVariants({ size, className }))}
      {...props}
    />
  );
}

export { Heading, headingVariants };
