"use client";

import { TriangleIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSourceTabMenu } from "./useSourceTabMenu";

export function SourceTabMenu({
  source,
  label,
}: {
  source: string;
  label: string;
}) {
  const { isDefault, makeDefault, clearDefault, archive, pending } =
    useSourceTabMenu(source);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        disabled={pending}
        aria-label={`${label} tab options`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 items-center justify-center rounded transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
      >
        <TriangleIcon
          aria-hidden
          className="size-2.5 rotate-180"
          fill="currentColor"
          strokeWidth={1}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {isDefault ? (
          <DropdownMenuItem onSelect={clearDefault}>
            Remove as default
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={makeDefault}>
            Set as default
          </DropdownMenuItem>
        )}
        {source !== "all" && (
          <DropdownMenuItem onSelect={archive}>Archive tab</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
