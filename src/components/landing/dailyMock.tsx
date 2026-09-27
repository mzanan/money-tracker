import { formatMoney } from "@/lib/currency";

import landingCopy from "./landing.json";

const mock = landingCopy.mocks.daily;
const maxBar = Math.max(...mock.bars);

export function DailyMock() {
  return (
    <div aria-hidden className="flex size-full flex-col gap-6 p-6 select-none">
      <div>
        <span className="text-eyebrow">{mock.spentLabel}</span>
        <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
          {formatMoney(mock.spent, "USD")}
        </p>
      </div>
      <div className="flex flex-1 items-end gap-1.5">
        {mock.bars.map((value, index) => (
          <span
            key={index}
            style={{
              height: `${(value / maxBar) * 100}%`,
              animationDelay: `${index * 60}ms`,
            }}
            className="bg-primary/70 animate-bar-grow flex-1 origin-bottom rounded-t-md motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="border-border grid grid-cols-2 gap-3 border-t pt-4">
        <div className="grid">
          <span className="text-meta text-muted-foreground">
            {mock.averageLabel}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(mock.average, "USD")}
          </span>
        </div>
        <div className="grid">
          <span className="text-meta text-muted-foreground">
            {mock.projectedLabel}
          </span>
          <span className="text-primary text-sm font-semibold tabular-nums">
            {formatMoney(mock.projected, "USD")}
          </span>
        </div>
      </div>
    </div>
  );
}
