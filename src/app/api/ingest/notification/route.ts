import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isSupportedCurrency } from "@/config/currencies";
import { roundForCurrency } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { parseNotification, sourceForApp } from "@/lib/ingest/notification";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { buildTransactionRow } from "@/lib/transactions";

interface IngestBody {
  token?: string;
  app?: string;
  title?: string;
  text?: string;
}

function tokenFrom(req: Request, body: IngestBody): string | null {
  const header =
    req.headers.get("x-ingest-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header?.trim() || body.token?.trim() || null;
}

export async function POST(req: Request) {
  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = tokenFrom(req, body);
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const account = await db
    .select({
      user_id: user_settings.user_id,
      currencies: user_settings.currencies,
      base_currency: user_settings.base_currency,
      timezone: user_settings.timezone,
    })
    .from(user_settings)
    .where(eq(user_settings.ingest_token, token))
    .limit(1)
    .then((rows) => rows[0]);
  if (!account) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }

  const parsed = parseNotification(
    { app: body.app, title: body.title, text },
    account.base_currency,
  );
  if (!parsed) {
    return NextResponse.json(
      { error: "unparsed", text },
      { status: 422 },
    );
  }

  let rates;
  try {
    rates = (await getRates()).rates;
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return NextResponse.json({ error: "rates_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "rates_error" }, { status: 502 });
  }

  if (!isSupportedCurrency(parsed.currency) && !rates[parsed.currency]) {
    return NextResponse.json(
      { error: "unsupported_currency", currency: parsed.currency },
      { status: 422 },
    );
  }

  const amount = roundForCurrency(parsed.amount, parsed.currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 422 });
  }

  const source = sourceForApp(body.app);
  const externalId = createHash("sha256")
    .update(`${body.app ?? ""}|${body.title ?? ""}|${text}`)
    .digest("hex")
    .slice(0, 32);

  const built = buildTransactionRow(
    {
      userId: account.user_id,
      kind: parsed.kind,
      amount,
      currency: parsed.currency,
      occurredOn: todayInTz(account.timezone ?? "UTC"),
      occurredAt: new Date().toISOString(),
      note: parsed.description,
      source,
      externalId,
    },
    { rates, userCurrencies: account.currencies },
  );
  if (!built) {
    return NextResponse.json({ error: "build_failed" }, { status: 422 });
  }

  const inserted = await db
    .insert(transactions)
    .values(built)
    .onConflictDoNothing({
      target: [
        transactions.user_id,
        transactions.source,
        transactions.external_id,
      ],
    })
    .returning({ id: transactions.id });

  if (inserted.length > 0) {
    revalidatePath("/", "layout");
  }

  return NextResponse.json({
    ok: true,
    imported: inserted.length,
    kind: parsed.kind,
    amount,
    currency: parsed.currency,
    source,
  });
}
