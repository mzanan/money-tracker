"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AddEntryFab({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="fab"
      aria-label="Add transaction"
      onClick={onClick}
      className="bottom-fab fixed right-4 z-40 lg:right-8 lg:bottom-8 lg:px-6"
    >
      <PlusIcon />
      <span className="hidden lg:inline">Add transaction</span>
    </Button>
  );
}
