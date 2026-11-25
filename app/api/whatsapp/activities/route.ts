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
  if (!sql) return NextResponse.json({ status: "success", activities: [] });

  const rows = await sql
    .query(`SELECT * FROM whatsapp_activities WHERE workspace_id = $1 ORDER BY id DESC LIMIT 100`, [workspaceId])
    .catch(() => []);
  return NextResponse.json({ status: "success", activities: rows || [] });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await req.json().catch(() => ({}));
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && body.phone_number && body.action) {
    await sql.query(
      `INSERT INTO whatsapp_activities (workspace_id, lead_id, business_name, contact_name, phone_number, action, notes, next_followup, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        workspaceId,
        body.lead_id ? Number(body.lead_id) : null,
        body.business_name || null,
        body.contact_name || null,
        String(body.phone_number),
        String(body.action),
        body.notes || null,
        body.next_followup || null,
      ]
    );
  }
  return NextResponse.json({ status: "success", message: "Activity recorded successfully" });
}
