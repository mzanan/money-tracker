"use client";

import { createContext, useContext } from "react";

import type { EntrySuggestion } from "@/lib/entrySuggestions";

const EntrySuggestionCatalogContext = createContext<EntrySuggestion[]>([]);

export function EntrySuggestionCatalogProvider({
  value,
  children,
}: {
  value: EntrySuggestion[];
  children: React.ReactNode;
}) {
  return (
    <EntrySuggestionCatalogContext.Provider value={value}>
      {children}
    </EntrySuggestionCatalogContext.Provider>
  );
}

export function useEntrySuggestionCatalog(): EntrySuggestion[] {
  return useContext(EntrySuggestionCatalogContext);
}
