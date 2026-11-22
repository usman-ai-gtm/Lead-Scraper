import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({
        status: "DEGRADED",
        system_version: "3.0.0",
        environment: "production",
        database_connected: false,
        total_users: 1,
        active_seats_used: 0,
        capacity: "Unlimited",
        total_workspaces: 1,
        total_leads: 0,
        total_searches: 0,
        total_emails_sent: 0,
      });
    }

    const sql = getNeonSql();
    if (!sql) throw new Error("Database connection unavailable");

    const start = Date.now();
    await sql`SELECT 1 as ping`;
    const latencyMs = Date.now() - start;

    const [usersCount, seatsCount, wsCount, leadsCount, searchCount, sentCount] = await Promise.all([
      sql`SELECT COUNT(*) as cnt FROM users`,
      sql`SELECT COUNT(*) as cnt FROM users WHERE role != 'ADMIN' AND status != 'REVOKED'`,
      sql`SELECT COUNT(*) as cnt FROM workspaces`,
      sql`SELECT COUNT(*) as cnt FROM leads`,
      sql`SELECT COUNT(*) as cnt FROM search_records`,
      sql`SELECT COUNT(*) as cnt FROM outreach_records WHERE outreach_status = 'EMAIL SENT'`,
    ]);

    const activeSeats = parseInt(seatsCount[0]?.cnt || "0", 10);

    return NextResponse.json({
      status: "HEALTHY",
      system_version: "3.0.0",
      environment: "production",
      database_connected: true,
      database_driver: "Neon PostgreSQL (Serverless)",
      database_latency_ms: latencyMs,
      total_users: parseInt(usersCount[0]?.cnt || "0", 10),
      active_seats_used: activeSeats,
      capacity: "Unlimited",
      total_workspaces: parseInt(wsCount[0]?.cnt || "0", 10),
      total_leads: parseInt(leadsCount[0]?.cnt || "0", 10),
      total_searches: parseInt(searchCount[0]?.cnt || "0", 10),
      total_emails_sent: parseInt(sentCount[0]?.cnt || "0", 10),
    });
  } catch (err: any) {
    console.error("[Admin Overview GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load admin overview metrics." },
      { status: 500 }
    );
  }
}
