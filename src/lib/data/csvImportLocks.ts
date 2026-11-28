import { and, eq, lt, sql } from "drizzle-orm";

import { forUser } from "@/lib/db/scope";
import { csv_import_locks } from "@/lib/db/schema";

export async function acquireCsvImportLock(
  userId: string,
  source: string,
  staleBefore: string,
): Promise<string | null> {
  const acquired = await forUser(userId)
    .insert(csv_import_locks, { source })
    .onConflictDoUpdate({
      target: [csv_import_locks.user_id, csv_import_locks.source],
      set: { created_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` },
      setWhere: lt(csv_import_locks.created_at, staleBefore),
    })
    .returning({ created_at: csv_import_locks.created_at });
  return acquired[0]?.created_at ?? null;
}

export async function releaseCsvImportLock(
  userId: string,
  source: string,
  token: string,
): Promise<void> {
  await forUser(userId).delete(
    csv_import_locks,
    and(
      eq(csv_import_locks.source, source),
      eq(csv_import_locks.created_at, token),
    ),
  );
}
