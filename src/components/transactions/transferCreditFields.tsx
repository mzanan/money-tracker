"use client";

import { DateField } from "@/components/ui/dateField";
import { SwitchRow } from "@/components/ui/switchRow";

export function TransferCreditFields({
  idPrefix,
  notReceived,
  onNotReceivedChange,
  creditedOn,
  onCreditedOnChange,
  sentOn,
}: {
  idPrefix: string;
  notReceived: boolean;
  onNotReceivedChange: (value: boolean) => void;
  creditedOn: string;
  onCreditedOnChange: (value: string) => void;
  sentOn: string;
}) {
  return (
    <div className="grid gap-3">
      <SwitchRow
        id={`${idPrefix}-not-received`}
        label="Not received yet"
        checked={notReceived}
        onCheckedChange={onNotReceivedChange}
      />
      {!notReceived && (
        <DateField
          id={`${idPrefix}-credited-on`}
          label="Credited on"
          value={creditedOn}
          min={sentOn}
          onChange={onCreditedOnChange}
        />
      )}
    </div>
  );
}
