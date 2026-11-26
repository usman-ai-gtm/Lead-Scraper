import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  // Honest zero state: never display fabricated analytics or revenue
  const fallback = {
    total_leads: 0,
    verified_leads: 0,
    high_intent_leads: 0,
    active_campaigns: 0,
    total_emails_sent: 0,
    open_rate: 0.0,
    reply_rate: 0.0,
    meetings_booked: 0,
    pipeline_value: 0.0,
    won_revenue: 0.0,
    conversion_rate: 0.0,
    health_score: 0,
    lead_growth_series: [],
    pipeline_by_stage: [],
    campaign_performance: [],
    recent_activities: []
  };
  return proxyToBackend("/api/analytics/dashboard", req, fallback);
}
