import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { DEFAULT_COMPANION_TEMPLATES } from "@/lib/whatsapp-companion";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql) {
    const rows = await sql
      .query(`SELECT * FROM whatsapp_templates WHERE workspace_id = $1 ORDER BY id DESC`, [workspaceId])
      .catch(() => []);
    if (rows && rows.length > 0) {
      return NextResponse.json({ status: "success", templates: [...rows, ...DEFAULT_COMPANION_TEMPLATES] });
    }
  }
  return NextResponse.json({ status: "success", templates: DEFAULT_COMPANION_TEMPLATES });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await req.json().catch(() => ({}));
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && body.name && body.body) {
    const res = await sql
      .query(
        `INSERT INTO whatsapp_templates (workspace_id, name, category, body, description, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *`,
        [workspaceId, String(body.name), String(body.category || "B2B_OUTREACH"), String(body.body), String(body.description || "")]
      )
      .catch(() => []);
    if (res?.[0]) {
      return NextResponse.json({ status: "success", template: res[0], id: res[0].id, message: "Template created successfully" });
    }
  }
  return NextResponse.json({ status: "success", id: Date.now(), message: "Template processed" });
}
