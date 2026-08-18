"use client";

import { useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { createLocation, deleteLocation } from "@/lib/actions/locations";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

import type { Location } from "@/types/db";

function rangeLabel(place: Location): string {
  if (place.start_date && place.end_date) {
    return `${place.start_date} to ${place.end_date}`;
  }
  if (place.start_date) return `from ${place.start_date}`;
  if (place.end_date) return `until ${place.end_date}`;
  return "any date";
}

export function PlacesDialog({
  places,
  trigger,
}: {
  places: Location[];
  trigger: React.ReactElement;
}) {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const create = useServerAction();
  const remove = useServerAction();

  const sorted = places
    .slice()
    .sort((a, b) => ((a.start_date ?? "") < (b.start_date ?? "") ? 1 : -1));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.run(() => createLocation({ label, startDate, endDate }), {
      success: "Place added",
      onSuccess: () => {
        setLabel("");
        setStartDate("");
        setEndDate("");
      },
    });
  }

  return (
    <Drawer size="sm">
      <DrawerTrigger render={trigger} />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <DrawerTitle>Places</DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or remove the places you track.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="gap-2">
          <form onSubmit={submit} className="grid gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Da Nang"
              maxLength={40}
              aria-label="Place name"
            />
            <div className="flex items-center gap-2">
              <label className="grid flex-1 gap-1">
                <span className="text-muted-foreground text-caption">From</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="From date"
                />
              </label>
              <label className="grid flex-1 gap-1">
                <span className="text-muted-foreground text-caption">To</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="To date"
                />
              </label>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={create.pending || !label.trim()}
            >
              {create.pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                "Add place"
              )}
            </Button>
            <p className="text-muted-foreground text-caption">
              Leave a date empty for open ended, e.g. only To for where you were
              before, only From for where you are now.
            </p>
          </form>
          {sorted.length > 0 && (
            <div className="grid gap-1">
              {sorted.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {place.label}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                    {rangeLabel(place)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      remove.run(() => deleteLocation(place.id), {
                        confirm: `Delete ${place.label}?`,
                        success: "Deleted",
                      })
                    }
                    disabled={remove.pending}
                    aria-label={`Delete ${place.label}`}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
