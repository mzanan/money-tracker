"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useHeldSources } from "@/hooks/useHeldAccounts";
import { useServerAction } from "@/hooks/useServerAction";
import { useTimezone } from "@/hooks/useSettings";
import { recordHeldReturn } from "@/lib/actions/heldReturn";
import { withoutArchived } from "@/lib/constants/sources";
import { parseAmountInput } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { heldHistory, type HeldRow } from "@/lib/transactionDisplay";
import type { Movement } from "@/types/ledger";

import { useAccountOptions } from "./useAccountOptions";

export function useOnHoldDrawer({
  movements,
  rows,
}: {
  movements: ReadonlyArray<Movement>;
  rows: HeldRow[];
}) {
  const labels = useAccountLabels();
  const heldSources = useHeldSources();
  const timezone = useTimezone();
  const { run, pending } = useServerAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [received, setReceived] = useState("");
  const [destination, setDestination] = useState("");
  const [withheld, setWithheld] = useState("");
  const [withheldNote, setWithheldNote] = useState("");
  const [date, setDate] = useState(() => todayInTz(timezone));

  const row = rows.find((candidate) => candidate.source === selected) ?? null;
  const options = useAccountOptions(selected ?? "", selected !== null);
  const destinations = options
    ? withoutArchived(options, [...heldSources])
    : null;
  const history = useMemo(
    () => (selected ? heldHistory(movements, selected, labels) : []),
    [selected, movements, labels],
  );

  function select(source: string) {
    const next = rows.find((candidate) => candidate.source === source);
    setSelected(source);
    setCurrency(next?.currencies[0] ?? "");
    setReceived("");
    setDestination("");
    setWithheld("");
    setWithheldNote("");
    setDate(todayInTz(timezone));
  }

  function back() {
    setSelected(null);
  }

  function submit() {
    if (!selected) return;
    const receivedAmount = parseAmountInput(received) ?? 0;
    const withheldAmount = parseAmountInput(withheld) ?? 0;
    if (receivedAmount <= 0 && withheldAmount <= 0) {
      toast.error("Enter the amount received or withheld");
      return;
    }
    run(
      () =>
        recordHeldReturn({
          source: selected,
          currency,
          received: receivedAmount,
          destination: destination || null,
          withheld: withheldAmount,
          withheldNote: withheldNote.trim() || null,
          occurredOn: date,
        }),
      { success: "Return recorded", onSuccess: back },
    );
  }

  return {
    selected,
    row,
    history,
    select,
    back,
    currency,
    setCurrency,
    received,
    setReceived,
    destinations,
    destination,
    setDestination,
    withheld,
    setWithheld,
    withheldNote,
    setWithheldNote,
    date,
    setDate,
    pending,
    submit,
  };
}
