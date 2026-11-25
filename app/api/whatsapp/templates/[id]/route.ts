import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && !Number.isNaN(id)) {
    await sql
      .query(
        `UPDATE whatsapp_templates
         SET name = COALESCE($1, name), category = COALESCE($2, category),
             body = COALESCE($3, body), description = COALESCE($4, description), updated_at = NOW()
         WHERE workspace_id = $5 AND id = $6`,
        [body.name || null, body.category || null, body.body || null, body.description ?? null, workspaceId, id]
      )
      .catch(() => {});
  }
  return NextResponse.json({ status: "success", message: `Template #${params.id} updated successfully` });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const id = Number(params.id);
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && !Number.isNaN(id)) {
    await sql.query(`DELETE FROM whatsapp_templates WHERE workspace_id = $1 AND id = $2`, [workspaceId, id]).catch(() => {});
  }
  return NextResponse.json({ status: "success", message: `Template #${params.id} deleted successfully` });
}
