import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  getNeonOutreachRecords,
  getNeonDueFollowups,
  updateNeonLeadOutreachStatus,
  getNeonSql,
  isNeonConfigured,
} from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message || "Authentication required" },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "ALL";
  const dueOnly = url.searchParams.get("due_only") === "true";

  if (dueOnly) {
    const dueRecords = await getNeonDueFollowups(workspaceId);
    return NextResponse.json({ records: dueRecords });
  }

  const records = await getNeonOutreachRecords(workspaceId, statusFilter);
  return NextResponse.json({ records });
}

export async function PATCH(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const authCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!authCheck.allowed) {
    return NextResponse.json({ error: authCheck.message }, { status: authCheck.statusCode || 403 });
  }
  const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { outreach_id, lead_id, status, followup_date, followup_notes } = body;

  const validStatuses = [
    "NEW",
    "DRAFT READY",
    "EMAIL SENT",
    "FAILED",
    "REPLIED",
    "INTERESTED",
    "NOT INTERESTED",
    "DO NOT CONTACT",
  ];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const sql = getNeonSql();
  const nowIso = new Date().toISOString();

  if (outreach_id && sql) {
    try {
      await sql.query(
        `UPDATE outreach_records SET
          outreach_status = COALESCE($1, outreach_status),
          followup_date = COALESCE($2, followup_date),
          followup_notes = COALESCE($3, followup_notes),
          last_activity = $4
        WHERE workspace_id = $5 AND id = $6`,
        [status || null, followup_date || null, followup_notes || null, nowIso, workspaceId, outreach_id]
      );
    } catch (e) {
      console.error("[Outreach PATCH Record Error]:", e);
    }
  }

  if (lead_id && status) {
    await updateNeonLeadOutreachStatus(workspaceId, Number(lead_id), status, followup_date || undefined);
  }

  return NextResponse.json({
    success: true,
    message: "Outreach record updated successfully.",
    status,
    followup_date: followup_date || null,
  });
}
