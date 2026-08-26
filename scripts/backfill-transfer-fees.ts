import { config } from "dotenv";
import { and, eq, like } from "drizzle-orm";

import { db } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";
import { roundForCurrency } from "../src/lib/currency";
import {
  EXTERNAL_ID_PREFIX,
  TRANSFER_FEE_DEST_SUFFIX,
} from "../src/lib/externalIds";
import { transferLegsAreNet } from "../src/lib/transfer";

config({ path: ".env.local" });
config();

delete process.env.TURSO_EMBEDDED_REPLICA_PATH;

const apply = process.argv.includes("--apply");

async function main() {
  const feeRows = await db
    .select()
    .from(transactions)
    .where(like(transactions.external_id, `${EXTERNAL_ID_PREFIX.transferFee}%`));

  const originFees = feeRows.filter(
    (row) => !row.external_id?.endsWith(TRANSFER_FEE_DEST_SUFFIX),
  );

  let planned = 0;
  let skipped = 0;

  for (const fee of originFees) {
    const group = fee.external_id!.slice(
      EXTERNAL_ID_PREFIX.transferFee.length,
    );
    const groupRows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, fee.user_id),
          eq(transactions.transfer_group, group),
        ),
      );

    if (groupRows.length === 0) {
      console.log(`skip ${group}: no rows in the group`);
      skipped++;
      continue;
    }
    if (
      groupRows.some((row) =>
        row.external_id?.startsWith(EXTERNAL_ID_PREFIX.withdrawal),
      )
    ) {
      console.log(`skip ${group}: withdrawal, already net`);
      skipped++;
      continue;
    }

    const destinationFeeId = `${fee.external_id}${TRANSFER_FEE_DEST_SUFFIX}`;
    const hasDestinationFee = feeRows.some(
      (row) => row.external_id === destinationFeeId,
    );
    if (transferLegsAreNet(groupRows, fee.amount_original, hasDestinationFee)) {
      console.log(`skip ${group}: already net`);
      skipped++;
      continue;
    }

    const targets = groupRows.filter(
      (row) =>
        row.kind === "expense" &&
        row.source === fee.source &&
        row.currency_original === fee.currency_original,
    );
    if (targets.length !== 1) {
      console.log(
        `skip ${group}: ${targets.length} candidate expense rows, expected 1`,
      );
      skipped++;
      continue;
    }

    const target = targets[0];
    const next = roundForCurrency(
      target.amount_original - fee.amount_original,
      target.currency_original,
    );
    if (next <= 0) {
      console.log(`skip ${group}: net amount would be ${next}`);
      skipped++;
      continue;
    }

    console.log(
      `${group}: ${target.source} ${target.amount_original} -> ${next} ${target.currency_original}`,
    );
    planned++;

    if (apply) {
      await db
        .update(transactions)
        .set({ amount_original: next })
        .where(
          and(
            eq(transactions.id, target.id),
            eq(transactions.user_id, target.user_id),
          ),
        );
    }
  }

  console.log(
    `${apply ? "applied" : "dry run"}: ${planned} row(s) to update, ${skipped} group(s) skipped`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
