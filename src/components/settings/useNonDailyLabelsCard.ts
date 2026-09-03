"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setFixedLabels } from "@/lib/actions/settings";
import { normalizeFixedLabel } from "@/lib/fixedExpenses";

export function useNonDailyLabelsCard() {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const [input, setInput] = useState("");

  const labels = settings.fixed_labels;

  function addLabel() {
    const normalized = normalizeFixedLabel(input);
    if (!normalized || labels.includes(normalized)) {
      setInput("");
      return;
    }
    const next = [...labels, normalized];
    setInput("");
    run(() => setFixedLabels(next), {
      success: `Added "${normalized}"`,
    });
  }

  function removeLabel(label: string) {
    const next = labels.filter((existing) => existing !== label);
    run(() => setFixedLabels(next), {
      success: `Removed "${label}"`,
    });
  }

  return { labels, input, setInput, addLabel, removeLabel, pending };
}
