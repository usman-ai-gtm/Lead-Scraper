import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const id = Number(params.id);
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql && !Number.isNaN(id)) {
    await sql.query(`DELETE FROM whatsapp_suppressions WHERE workspace_id = $1 AND id = $2`, [workspaceId, id]).catch(() => {});
  }
  return NextResponse.json({ status: "success", message: "Suppression removed successfully" });
}
