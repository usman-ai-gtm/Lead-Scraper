import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner authentication required." }, { status: 403 });
  }
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const isNeon = dbUrl.toLowerCase().includes("neon.tech");
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
  const hasEnv = Boolean(dbUrl);

  let dbConnected = false;
  let latencyMs = 0;
  let totalLeads = 0;
  let totalSearchRecords = 0;
  let totalWorkspaces = 0;
  let schemaInfo: any = null;
  let dbError: string | null = null;

  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        const start = Date.now();
        const pingRes = await sql`SELECT 1 as ping`;
        latencyMs = Date.now() - start;

        if (pingRes && pingRes.length > 0) {
          dbConnected = true;

          // Safe non-destructive column auto-ensure
          try {
            await sql`
              ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TEXT;
              ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'STARTER';
              ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
              ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 1;
              ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;
              ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
            `;
          } catch (mErr) {
            console.warn("Schema migration non-blocking warning:", mErr);
          }

          const leadsRes = await sql`SELECT COUNT(*) as cnt FROM leads`;
          totalLeads = parseInt(leadsRes[0]?.cnt || "0", 10);

          const searchesRes = await sql`SELECT COUNT(*) as cnt FROM search_records`;
          totalSearchRecords = parseInt(searchesRes[0]?.cnt || "0", 10);

          const wsRes = await sql`SELECT COUNT(*) as cnt FROM workspaces`;
          totalWorkspaces = parseInt(wsRes[0]?.cnt || "0", 10);

          const userColsRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
          const wsColsRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces' ORDER BY ordinal_position`;
          schemaInfo = {
            users: userColsRes.map((r: any) => r.column_name),
            workspaces: wsColsRes.map((r: any) => r.column_name),
          };
        }
      }
    } catch (err: any) {
      dbError = err?.message || String(err);
      console.error("Neon live persistence probe error:", dbError);
    }
  }

  const responseData = {
    mode: dbConnected ? "cloud_database" : (isVercel ? "serverless_local" : "local_sqlite"),
    driver: dbConnected
      ? (isNeon ? "Neon PostgreSQL (Serverless Cloud Hosted)" : "PostgreSQL (Cloud Hosted)")
      : (isVercel ? "Vercel Serverless (Ephemeral / LocalStorage Fallback)" : "SQLite 3 (Local Embedded)"),
    configured: dbConnected,
    database_connected: dbConnected,
    latency_ms: latencyMs,
    schema: schemaInfo,
    stats: dbConnected
      ? {
          total_leads: totalLeads,
          total_search_records: totalSearchRecords,
          total_workspaces: totalWorkspaces,
        }
      : null,
    error: dbError,
    message: dbConnected
      ? `Authoritative Neon PostgreSQL connected and actively responding (${latencyMs}ms latency).`
      : (hasEnv
        ? `DATABASE_URL environment variable is detected, but connection query failed: ${dbError}`
        : (isVercel
          ? "Running on Vercel Serverless. External DATABASE_URL is required for multi-tenant cloud persistence."
          : "Running on local SQLite. In serverless deployments without DATABASE_URL, persistent multi-user data requires an external database connection."))
  };

  return new NextResponse(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
