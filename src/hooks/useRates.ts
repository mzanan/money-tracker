"use client";

import { useQuery } from "@tanstack/react-query";

import type { FxRates } from "@/types/db";

export interface RatesResponse {
  base: string;
  rates: FxRates;
  fetchedAt: string;
  stale: boolean;
}

export class RatesFetchError extends Error {
  constructor(public readonly code: "unavailable" | "unauthorized" | "error") {
    super(code);
    this.name = "RatesFetchError";
  }
}

async function fetchRates(): Promise<RatesResponse> {
  const response = await fetch("/api/rates");
  if (!response.ok) {
    if (response.status === 503) throw new RatesFetchError("unavailable");
    if (response.status === 401) throw new RatesFetchError("unauthorized");
    throw new RatesFetchError("error");
  }
  return (await response.json()) as RatesResponse;
}

export function useRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: fetchRates,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
