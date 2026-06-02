import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import { IngestPanel } from "./ingestPanel";

export async function IngestCard() {
  const user = await getUser();
  if (!user) return null;

  const row = await db
    .select({ token: user_settings.ingest_token })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  const appUrl = (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
  ).replace(/\/$/, "");
  const endpoint = `${appUrl}/api/ingest/notification`;

  return <IngestPanel token={row?.token ?? null} endpoint={endpoint} />;
}
