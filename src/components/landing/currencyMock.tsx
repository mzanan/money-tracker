import { LockIcon } from "lucide-react";

import { Avatar } from "@/components/transactions/avatar";
import { ListRow } from "@/components/ui/listRow";
import { formatMoney } from "@/lib/currency";

import landingCopy from "./landing.json";
import { Ticker } from "./ticker";

const mock = landingCopy.mocks.currency;

export function CurrencyMock() {
  return (
    <div aria-hidden className="flex size-full flex-col gap-6 p-6 select-none">
      <div className="bg-card flex items-center justify-between rounded-card px-4 py-3">
        <span className="text-eyebrow">{mock.rateLabel}</span>
        <Ticker
          items={mock.rates}
          className="text-sm font-semibold tabular-nums"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-eyebrow mb-3 inline-flex items-center gap-1.5">
          <LockIcon className="size-3" />
          {mock.lockedLabel}
        </span>
        {mock.rows.map((row) => (
          <ListRow
            key={row.note}
            leading={<Avatar seed={row.note} />}
            title={formatMoney(row.converted, "USD")}
            meta={row.rate}
          >
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatMoney(row.amount, row.currency)}
            </span>
          </ListRow>
        ))}
      </div>
    </div>
  );
}
