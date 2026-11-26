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
          `SELECT id, username, email, full_name, role, account_type, status, last_login, workspace_id
           FROM users ORDER BY id ASC`
        )
        .catch(() => []);
      return NextResponse.json(rows || []);
    }
  }
  return NextResponse.json([]);
}
