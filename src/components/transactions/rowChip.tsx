import { Badge } from "@/components/ui/badge";
import { TagChip } from "@/components/ui/tagChip";
import type { RowChipItem } from "@/lib/transactionDisplay";

export function RowChip({ chip }: { chip: RowChipItem }) {
  if (chip.kind === "tag") return <TagChip tag={chip.label} />;
  return <Badge variant="secondary">{chip.label}</Badge>;
}
