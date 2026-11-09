"use client";

import type { RatesByDate } from "@/types/ledger";

import { createStrictContext } from "./createStrictContext";

const [RatesByDateProvider, useRatesByDate] =
  createStrictContext<RatesByDate>("useRatesByDate");

export { RatesByDateProvider, useRatesByDate };
