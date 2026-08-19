"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { createLocation, deleteLocation } from "@/lib/actions/locations";
import type { Location } from "@/types/db";

export function usePlacesDialog(places: Location[]) {
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

  function removePlace(place: Location) {
    remove.run(() => deleteLocation(place.id), {
      confirm: `Delete ${place.label}?`,
      success: "Deleted",
    });
  }

  return {
    label,
    setLabel,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    createPending: create.pending,
    removePending: remove.pending,
    sorted,
    submit,
    removePlace,
  };
}
