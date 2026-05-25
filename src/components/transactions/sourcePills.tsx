"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { syncIntegration } from "@/lib/actions/integrations";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import { cn } from "@/lib/utils";
import type { IntegrationProvider } from "@/types/db";

import { Button } from "@/components/ui/button";

interface Props {
  sources: string[];
  selected: string;
  onChange: (source: string) => void;
}

export function SourcePills({ sources, selected, onChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const kind = selected === "all" ? null : kindOfSource(selected);

  function handleSync() {
    if (kind !== "api") return;
    startTransition(async () => {
      const result = await syncIntegration(selected as IntegrationProvider);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { imported, skipped } = result.data!;
      toast.success(
        `${labelForSource(selected)}: imported ${imported}` +
          (skipped > 0 ? `, ${skipped} skipped` : ""),
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        role="tablist"
        className="scrollbar-thin border-border/60 -mx-4 flex flex-1 gap-5 overflow-x-auto border-b px-4"
      >
        <Tab selected={selected === "all"} onClick={() => onChange("all")}>
          All
        </Tab>
        {sources.map((src) => (
          <Tab
            key={src}
            selected={selected === src}
            onClick={() => onChange(src)}
          >
            {labelForSource(src)}
          </Tab>
        ))}
      </div>
      {kind === "api" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSync}
          disabled={pending}
          className="rounded-full"
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
          Sync
        </Button>
      )}
      {kind === "csv" && (
        <Button
          size="sm"
          variant="secondary"
          asChild
          className="rounded-full"
        >
          <Link href="/settings">
            <ExternalLinkIcon />
            Re-import
          </Link>
        </Button>
      )}
    </div>
  );
}

function Tab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        "relative shrink-0 py-3 text-sm transition-colors",
        selected
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium",
      )}
    >
      {children}
      {selected && (
        <span
          aria-hidden
          className="bg-foreground absolute -bottom-px left-0 right-0 h-0.5"
        />
      )}
    </button>
  );
}
