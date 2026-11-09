import { EntrySuggestionCatalogProvider } from "@/hooks/useEntrySuggestionCatalog";
import { LedgerMovementsProvider } from "@/hooks/useLedgerMovements";
import { RatesByDateProvider } from "@/hooks/useRatesByDate";
import { buildEntrySuggestions } from "@/lib/entrySuggestions";
import type { LedgerData } from "@/types/ledger";

export function LedgerProviders({
  ledger,
  children,
}: {
  ledger: LedgerData;
  children: React.ReactNode;
}) {
  return (
    <RatesByDateProvider value={ledger.ratesByDate}>
      <LedgerMovementsProvider value={ledger.movements}>
        <EntrySuggestionCatalogProvider
          value={buildEntrySuggestions(ledger.movements)}
        >
          {children}
        </EntrySuggestionCatalogProvider>
      </LedgerMovementsProvider>
    </RatesByDateProvider>
  );
}
