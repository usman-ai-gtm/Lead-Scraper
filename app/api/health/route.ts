import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const started = Date.now();
  const timestamp = new Date().toISOString();

  if (!isNeonConfigured()) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "usman-ai-gtm",
        database: "unconfigured",
        timestamp,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "usman-ai-gtm",
        database: "unavailable",
        timestamp,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await sql.query("SELECT 1 AS ok");
    return NextResponse.json(
      {
        status: "ok",
        service: "usman-ai-gtm",
        database: "connected",
        latency_ms: Date.now() - started,
        timestamp,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "usman-ai-gtm",
        database: "error",
        latency_ms: Date.now() - started,
        timestamp,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
