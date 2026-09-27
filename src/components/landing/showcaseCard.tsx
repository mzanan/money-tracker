import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { Surface } from "@/components/ui/surface";
import { enterUpClasses, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ShowcaseCard({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: ReactNode;
}) {
  return (
    <Surface
      asChild
      padding="none"
      style={staggerDelay(step)}
      className={cn(
        "ring-border flex flex-col overflow-hidden ring-1",
        enterUpClasses,
      )}
    >
      <article>
        <div className="bg-surface-2/40 relative aspect-[4/5] overflow-hidden">
          {children}
        </div>
        <Heading size="section" className="px-6 py-5">
          {title}
        </Heading>
      </article>
    </Surface>
  );
}
