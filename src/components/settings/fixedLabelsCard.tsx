"use client";

import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/listRow";

import { useFixedLabelsCard } from "./useFixedLabelsCard";

export function FixedLabelsCard() {
  const { labels, input, setInput, addLabel, removeLabel, pending } =
    useFixedLabelsCard();

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid divide-y">
          {labels.length === 0 && (
            <p className="text-muted-foreground py-2 text-xs">
              No non-daily labels yet.
            </p>
          )}
          {labels.map((label) => (
            <ListRow key={label} title={label}>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${label}`}
                disabled={pending}
                onClick={() => removeLabel(label)}
              >
                <XIcon />
              </Button>
            </ListRow>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLabel();
              }
            }}
            placeholder="Merchant name"
            disabled={pending}
            className="h-8 text-sm"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Add label"
            disabled={pending || !input.trim()}
            onClick={addLabel}
          >
            <PlusIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
