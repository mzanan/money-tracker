"use client";

import type { AccountLabels } from "@/lib/data/accounts";

import { createStrictContext } from "./createStrictContext";

const [AccountLabelsProvider, useAccountLabels] =
  createStrictContext<AccountLabels>("useAccountLabels");

export { AccountLabelsProvider, useAccountLabels };
