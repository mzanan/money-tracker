"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AddEntryFab({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="fab"
      aria-label="Add transaction"
      onClick={onClick}
      className="bottom-fab fixed right-4 z-40 lg:hidden"
    >
      <PlusIcon />
    </Button>
  );
}
