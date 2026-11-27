import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { evaluateContactReadiness } from "@/lib/lead-quality-engine";

interface RouteParams {
  params: { id: string };
}

function buildEvidenceBasedIntent(id: string, lead: any | null) {
  if (!lead) {
    return {
      success: true,
      lead_id: Number(id),
      synthesis: {
        buying_intent_score: 0,
        buying_intent_level: "UNKNOWN (Lead Record Not Loaded)",
        intent_categories: [],
        positive_signals: [],
        negative_signals: [],
        observed: [],
        inferred: [],
        unknown: ["No persisted lead record found in database for live signal evaluation."],
        supporting_evidence: [],
        missing_evidence: ["Website inspection", "Contact verification"],
        recommended_action: "Run lead enrichment first to inspect the website and contact channels.",
        intent_confidence: 0,
      },
      master_judge: "USMAN Evidence Reasoner",
      conflicts: [],
    };
  }

  const readiness = evaluateContactReadiness(lead);
  let enrichment: any = {};
  if (lead.enrichment_data && typeof lead.enrichment_data === "object") {
    enrichment = lead.enrichment_data;
  }

  const observed: string[] = [];
  const missing: string[] = [];
  const categories: string[] = [];
  let score = 20;

  if (readiness.hasWebsite) {
    observed.push(`Official website present (${lead.website || lead.domain})`);
    score += 15;
  } else {
    missing.push("Official website URL");
    categories.push("Website Development / Digital Presence");
  }

  if (readiness.emailSyntaxValid) {
    observed.push(`Business email available (${lead.email_status || "Syntax Valid"})`);
    score += 15;
  } else {
    missing.push("Verified business email");
  }

  if (enrichment.hiring_detected || enrichment.careers_url) {
    observed.push(`Active hiring/careers signal detected${enrichment.careers_url ? ` (${enrichment.careers_url})` : ""}`);
    categories.push("Active Hiring / Expansion");
    score += 25;
  }
  if (Array.isArray(enrichment.tech_stack) && enrichment.tech_stack.length > 0) {
    observed.push(`Observed tech stack: ${enrichment.tech_stack.join(", ")}`);
    categories.push(`Platform Stack (${enrichment.tech_stack[0]})`);
    score += 10;
  }
  if (Array.isArray(enrichment.website_weaknesses) && enrichment.website_weaknesses.length > 0) {
    observed.push(`Observed website gaps: ${enrichment.website_weaknesses.join(", ")}`);
    categories.push("Website Optimization / Marketing Redesign");
    score += 15;
  }
  if (enrichment.gleif?.lei) {
    observed.push(`GLEIF Registered Legal Entity (${enrichment.gleif.lei})`);
    score += 10;
  }

  const boundedScore = Math.min(100, score);
  const level =
    boundedScore >= 70
      ? "STRONG EVIDENCE SIGNALS"
      : boundedScore >= 45
      ? "MODERATE EVIDENCE SIGNALS"
      : "LIMITED PUBLIC SIGNALS";

  return {
    success: true,
    lead_id: Number(id),
    synthesis: {
      buying_intent_score: boundedScore,
      buying_intent_level: level,
      intent_categories: categories.length > 0 ? categories : [lead.buying_intent_category || "General B2B Prospect"],
      positive_signals: observed,
      negative_signals: [],
      observed,
      inferred: categories.length > 0 ? [`Signals align with ${categories[0]}`] : [],
      unknown: ["Internal procurement timing and budget approval status are unknown until outreach."],
      supporting_evidence: observed,
      missing_evidence: missing,
      recommended_action: readiness.emailSyntaxValid
        ? "Reference observed public website/business facts in first outreach."
        : "Run public web enrichment to uncover verified contact channels before outreach.",
      intent_confidence: Number((observed.length / 6).toFixed(2)),
    },
    master_judge: "USMAN Factual Evidence Engine",
    conflicts: [],
  };
}

export async function POST(req: Request, { params }: RouteParams) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "ai_research");
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
  return NextResponse.json(buildEvidenceBasedIntent(params.id, lead));
}

export async function GET(req: Request, { params }: RouteParams) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "ai_research");
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
  const res = buildEvidenceBasedIntent(params.id, lead);
  return NextResponse.json({
    id: Number(params.id),
    lead_id: Number(params.id),
    buying_intent_score: res.synthesis.buying_intent_score,
    buying_intent_level: res.synthesis.buying_intent_level,
    intent_categories: res.synthesis.intent_categories,
    positive_signals: res.synthesis.positive_signals,
    negative_signals: [],
    observed_signals: res.synthesis.observed,
    inferred_signals: res.synthesis.inferred,
    unknown_signals: res.synthesis.unknown,
    supporting_evidence: res.synthesis.supporting_evidence,
    missing_evidence: res.synthesis.missing_evidence,
    recommended_action: res.synthesis.recommended_action,
    intent_confidence: res.synthesis.intent_confidence,
    master_judge: res.master_judge,
    analyzed_at: new Date().toISOString(),
  });
}
