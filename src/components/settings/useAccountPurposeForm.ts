"use client";

import { useState } from "react";

import { setAccountPurpose } from "@/lib/actions/accounts";
import {
  NO_PURPOSE,
  purposeFromChoice,
  type HeldAccount,
  type PurposeChoice,
} from "@/lib/accountPurpose";
import { useServerAction } from "@/hooks/useServerAction";

export function useAccountPurposeForm({
  source,
  held,
  onDone,
}: {
  source: string;
  held: HeldAccount | undefined;
  onDone: () => void;
}) {
  const { run, pending } = useServerAction();
  const [choice, setChoice] = useState<PurposeChoice>(
    held?.purpose ?? NO_PURPOSE,
  );
  const [expectedOn, setExpectedOn] = useState(held?.expectedOn ?? "");

  const purpose = purposeFromChoice(choice);

  function submit() {
    run(
      () =>
        setAccountPurpose(
          source,
          purpose,
          purpose && expectedOn ? expectedOn : null,
        ),
      { success: "Account updated", onSuccess: onDone },
    );
  }

  return {
    choice,
    setChoice,
    expectedOn,
    setExpectedOn,
    showDate: purpose !== null,
    pending,
    submit,
  };
}
