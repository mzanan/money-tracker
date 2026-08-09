"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveOnboarding } from "@/lib/actions/settings";
import { getDeviceTimezone } from "@/lib/dates";

export type Step = 1 | 2;

export function useOnboardingForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [base, setBase] = useState<string>("");
  const [tz, setTz] = useState("");
  const [loading, setLoading] = useState(false);

  const deviceTz = getDeviceTimezone();

  function toggle(code: string) {
    const isRemoving = selected.includes(code);
    const next = isRemoving
      ? selected.filter((current) => current !== code)
      : [...selected, code];
    setSelected(next);
    if (next.length === 1) setBase(next[0]);
    else if (isRemoving && code === base) setBase(next[0] ?? "");
  }

  function goNext() {
    if (selected.length === 0) {
      toast.error("Pick at least one currency");
      return;
    }
    if (!base) setBase(selected[0]);
    setStep(2);
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await saveOnboarding({
      currencies: selected,
      baseCurrency: base,
      timezone: tz.trim() || null,
    });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    toast.success("All set! Time to track.");
    router.replace("/");
    router.refresh();
  }

  const canSubmit = selected.length >= 1 && selected.includes(base);

  return {
    step,
    setStep,
    selected,
    base,
    setBase,
    tz,
    setTz,
    loading,
    deviceTz,
    toggle,
    goNext,
    handleSubmit,
    canSubmit,
  };
}
