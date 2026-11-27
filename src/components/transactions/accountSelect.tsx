"use client";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { resolveSourceLabel } from "@/lib/constants/sources";

import { LoadingText } from "@/components/ui/loadingText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AccountSelect({
  sources,
  value,
  onValueChange,
  id,
  emptyMessage,
  size,
}: {
  sources: string[] | null;
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  emptyMessage?: string;
  size?: "sm" | "default";
}) {
  const accountLabels = useAccountLabels();
  if (sources === null) {
    return <LoadingText>Loading accounts…</LoadingText>;
  }
  if (emptyMessage && sources.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} size={size}>
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {sources.map((source) => (
          <SelectItem key={source} value={source}>
            {resolveSourceLabel(source, accountLabels)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
