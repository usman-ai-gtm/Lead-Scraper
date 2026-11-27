import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { calculateLeadQualityScore, evaluateContactReadiness } from "@/lib/lead-quality-engine";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  const leadId = parseInt(params.id, 10);
  let lead: any = null;

  if (!isNaN(leadId) && isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      const rows = await sql`SELECT * FROM leads WHERE id = ${leadId} AND workspace_id = ${workspaceId} LIMIT 1`;
      if (rows?.[0]) lead = rows[0];
    }
  }

  if (!lead) {
    return NextResponse.json({ detail: "Lead record not found in workspace." }, { status: 404 });
  }

  const q = calculateLeadQualityScore(lead);
  const r = evaluateContactReadiness(lead);
  const missingList = r.factors.filter((f) => !f.met).map((f) => f.label);

  return NextResponse.json({
    lead_id: Number(lead.id),
    lead_score: q.score,
    final_lead_score: q.score,
    data_confidence_score: r.score,
    qualification_level: q.category,
    priority: q.score >= 80 ? "HIGH" : q.score >= 55 ? "MEDIUM" : "LOW",
    positive_signals: q.reasons.join(" | ") || lead.positive_signals || "None observed",
    negative_signals: missingList.length > 0 ? `Missing: ${missingList.join(", ")}` : "None",
    missing_info: missingList.join(", ") || "None",
    recommended_action: r.emailSyntaxValid
      ? "Verify message fit and initiate personalized outreach."
      : "Enrich lead or check official website for email before outreach.",
    scoring_confidence: Number((r.factors.filter((f) => f.met).length / r.factors.length).toFixed(2)),
  });
}
