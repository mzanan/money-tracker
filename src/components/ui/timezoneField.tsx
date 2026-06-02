"use client";

import { useId, useMemo } from "react";
import { MapPinIcon } from "lucide-react";

import { getSupportedTimezones } from "@/lib/dates";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TimezoneField({
  value,
  onChange,
  deviceTz,
  id = "timezone",
}: {
  value: string;
  onChange: (value: string) => void;
  deviceTz: string;
  id?: string;
}) {
  const listId = useId();
  const timezones = useMemo(() => getSupportedTimezones(), []);

  return (
    <>
      <div className="flex gap-2">
        <Input
          id={id}
          list={listId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`auto (${deviceTz})`}
          className="flex-1"
        />
        {value && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange("")}
            className="gap-1"
          >
            <MapPinIcon className="size-3.5" /> Auto
          </Button>
        )}
      </div>
      {timezones.length > 0 && (
        <datalist id={listId}>
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      )}
    </>
  );
}
