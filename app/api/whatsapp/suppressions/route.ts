import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ status: "success", suppressions: [] });

  const rows = await sql
    .query(`SELECT * FROM whatsapp_suppressions WHERE workspace_id = $1 ORDER BY id DESC`, [workspaceId])
    .catch(() => []);
  return NextResponse.json({ status: "success", suppressions: rows || [] });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await req.json().catch(() => ({}));
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && body.phone_number) {
    await sql
      .query(
        `INSERT INTO whatsapp_suppressions (workspace_id, phone_number, reason, business_name, created_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [workspaceId, String(body.phone_number), String(body.reason || "User Opt-Out"), body.business_name || null]
      )
      .catch(() => {});
  }
  return NextResponse.json({ status: "success", message: "Suppression recorded successfully" });
}
