import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql } from "@/lib/neon-db";
import { enrichLeadRecord } from "@/lib/lead-enrichment-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const requestedLeadIds: number[] = Array.isArray(body.lead_ids) ? body.lead_ids : [];

  let leadsToEnrich: any[] = [];
  if (requestedLeadIds.length > 0) {
    leadsToEnrich = await sql`
      SELECT * FROM leads 
      WHERE workspace_id = ${workspaceId} AND id = ANY(${requestedLeadIds})
      LIMIT 20
    `;
  } else {
    // Enrich top 10 unenriched leads in workspace
    leadsToEnrich = await sql`
      SELECT * FROM leads 
      WHERE workspace_id = ${workspaceId} AND (is_enriched IS NOT TRUE OR is_enriched IS NULL)
      ORDER BY id DESC
      LIMIT 10
    `;
  }

  const results: any[] = [];
  for (const lead of leadsToEnrich) {
    const res = await enrichLeadRecord(lead, workspaceId);
    results.push(res);
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    results,
  });
}
