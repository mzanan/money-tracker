import { NextResponse } from "next/server";

import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await getRates();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return NextResponse.json(
        { error: "rates_unavailable" },
        { status: 503 },
      );
    }
    console.error("/api/rates failed", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
