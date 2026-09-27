import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { Surface } from "@/components/ui/surface";

export function ShowcaseCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Surface
      asChild
      padding="none"
      className="ring-border flex flex-col overflow-hidden ring-1"
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
