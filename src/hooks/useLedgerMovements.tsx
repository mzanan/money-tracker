"use client";

import type { Movement } from "@/types/ledger";

import { createStrictContext } from "./createStrictContext";

const [LedgerMovementsProvider, useLedgerMovements] =
  createStrictContext<ReadonlyArray<Movement>>("useLedgerMovements");

export { LedgerMovementsProvider, useLedgerMovements };
