import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
  }

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      const rows = await sql
        .query(
          `SELECT id, workspace_id, actor AS user, account_id, action, result AS status, details, timestamp
           FROM account_audit_logs
           ORDER BY id DESC
           LIMIT 100`
        )
        .catch(() => []);
      return NextResponse.json({ status: "success", audit_logs: rows || [] });
    }
  }

  return NextResponse.json({ status: "success", audit_logs: [] });
}
