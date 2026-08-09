import { Loader2Icon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";

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
}: {
  sources: string[] | null;
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  emptyMessage?: string;
}) {
  if (sources === null) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2Icon className="size-4 animate-spin" /> Loading accounts…
      </p>
    );
  }
  if (emptyMessage && sources.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {sources.map((source) => (
          <SelectItem key={source} value={source}>
            {labelForSource(source)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
