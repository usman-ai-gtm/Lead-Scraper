import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql } from "@/lib/neon-db";
import { enrichLeadRecord } from "@/lib/lead-enrichment-engine";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;
  const leadId = parseInt(params.id, 10);
  if (isNaN(leadId)) {
    return NextResponse.json({ error: "Invalid lead ID." }, { status: 400 });
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const rows = await sql`
    SELECT * FROM leads 
    WHERE id = ${leadId} AND workspace_id = ${workspaceId} 
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });
  }

  const lead = rows[0];
  const enrichmentResult = await enrichLeadRecord(lead, workspaceId);

  return NextResponse.json({
    success: true,
    result: enrichmentResult,
  });
}
