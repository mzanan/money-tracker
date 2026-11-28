import { createHash } from "node:crypto";

import { RECIPE_VERSION } from "@/lib/sheetImport/recipe";

export function layoutHash(signature: string): string {
  return createHash("sha256")
    .update(`v${RECIPE_VERSION}|${signature}`)
    .digest("hex");
}
