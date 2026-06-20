"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHideAmounts } from "@/hooks/useHideAmounts";

export function AmountsToggle() {
  const { hideAmounts, toggleHideAmounts } = useHideAmounts();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={toggleHideAmounts}
      aria-label={hideAmounts ? "Show amounts" : "Hide amounts"}
    >
      {hideAmounts ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  );
}
