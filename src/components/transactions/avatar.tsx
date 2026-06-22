import type { CSSProperties } from "react";

import { IconCircle } from "@/components/ui/iconCircle";
import { tagHue } from "@/lib/tags";

export function Avatar({ seed }: { seed: string }) {
  const letter = (seed.trim()[0] ?? "?").toUpperCase();
  return (
    <IconCircle
      style={{ "--tag-h": tagHue(seed) } as CSSProperties}
      className="tag-chip text-sm font-semibold"
    >
      {letter}
    </IconCircle>
  );
}
