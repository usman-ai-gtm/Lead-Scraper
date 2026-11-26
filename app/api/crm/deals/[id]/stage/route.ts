import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const dealId = Number(params.id);
  if (!dealId || Number.isNaN(dealId)) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const stage = String(body.stage || "").trim();
  if (!stage) {
    return NextResponse.json({ error: "stage is required" }, { status: 400 });
  }

  if (!isNeonConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ error: "Database connection failed" }, { status: 503 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  const rows = await sql.query(
    `UPDATE crm_deals
     SET stage = $1, updated_at = $2
     WHERE id = $3 AND workspace_id = $4
     RETURNING id, stage`,
    [stage, new Date().toISOString(), dealId, workspaceId]
  );

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Deal not found in workspace" }, { status: 404 });
  }

  return NextResponse.json({ status: "success", deal: rows[0] });
}
