import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <Heading>{title}</Heading>
      <div className="text-muted-foreground grid gap-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}
