import type { ComponentType } from "react";

import { CurrencyMock } from "./currencyMock";
import { DailyMock } from "./dailyMock";
import landingCopy from "./landing.json";
import { ShowcaseCard } from "./showcaseCard";
import { SyncMock } from "./syncMock";

const SHOWCASE_MOCKS: Partial<Record<string, ComponentType>> = {
  currency: CurrencyMock,
  daily: DailyMock,
  sync: SyncMock,
};

export function LandingShowcase() {
  return (
    <div className="grid w-full gap-4 text-left sm:grid-cols-3">
      {landingCopy.showcase.map((item) => {
        const Mock = SHOWCASE_MOCKS[item.id];
        return (
          <ShowcaseCard key={item.id} title={item.title}>
            {Mock && <Mock />}
          </ShowcaseCard>
        );
      })}
    </div>
  );
}
