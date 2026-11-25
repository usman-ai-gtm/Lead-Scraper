import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonLeadById, deleteNeonLead, isNeonConfigured, getNeonSql, updateNeonLeadOutreachStatus } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const id = Number(params.id);
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  if (isNeonConfigured()) {
    const lead = await getNeonLeadById(workspaceId, id);
    if (lead) return NextResponse.json(lead);
  }

  return NextResponse.json({ detail: "Lead not found in this workspace" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ detail: "Invalid lead ID" }, { status: 400 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await req.json().catch(() => ({}));

  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
  }
  const sql = getNeonSql();
  if (!sql) return NextResponse.json({ detail: "Database connection failed" }, { status: 503 });

  const existing = await getNeonLeadById(workspaceId, id);
  if (!existing) {
    return NextResponse.json({ detail: "Lead not found in your workspace" }, { status: 404 });
  }

  if (body.whatsapp_status !== undefined) {
    const allowedWa = ["CONFIRMED", "NOT_CONFIRMED", "NOT_CHECKED"];
    const nextWa = String(body.whatsapp_status).toUpperCase();
    if (!allowedWa.includes(nextWa)) {
      return NextResponse.json({ detail: "Invalid whatsapp_status" }, { status: 400 });
    }
    const method = nextWa === "NOT_CHECKED" ? null : "MANUAL_USER_CHECK";
    await sql.query(
      `UPDATE leads
       SET whatsapp_status = $1,
           whatsapp_checked_at = CASE WHEN $1 = 'NOT_CHECKED' THEN NULL ELSE NOW() END,
           whatsapp_verification_method = $2,
           updated_at = $3
       WHERE workspace_id = $4 AND id = $5`,
      [nextWa, method, new Date().toISOString(), workspaceId, id]
    );
  }

  if (body.crm_stage !== undefined) {
    await updateNeonLeadOutreachStatus(workspaceId, id, String(body.crm_stage), body.next_followup);
  }

  const updated = await getNeonLeadById(workspaceId, id);
  return NextResponse.json({ status: "success", lead: updated });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const id = Number(params.id);
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  if (isNeonConfigured()) {
    const deleted = await deleteNeonLead(workspaceId, id);
    if (deleted) {
      return NextResponse.json({
        status: "success",
        message: `Lead #${id} deleted successfully from workspace.`,
      });
    }
  }

  return NextResponse.json(
    { detail: "Lead not found or unauthorized to delete" },
    { status: 404 }
  );
}
