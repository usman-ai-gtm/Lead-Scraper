import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  return NextResponse.json({
    categories: [
      { id: "lead_quality", name: "Deterministic Validation & Scoring", count: 2 },
      { id: "research_ai", name: "AI Lead Research & Drafts", count: 2 },
    ],
    features: [
      {
        id: 1,
        name: "Contact Readiness & DNS MX Validator",
        category: "lead_quality",
        status: "LIVE",
        description: "Evaluates email syntax, MX domain records, and E.164 phone structure on workspace leads.",
      },
      {
        id: 2,
        name: "AI Lead Research & Outreach Draft",
        category: "research_ai",
        status: subCheck.entitlements?.features.ai_research ? "LIVE" : "PLAN_GATED",
        description: "Generates bespoke B2B outreach drafts from saved website and industry context.",
      },
    ],
  });
}
