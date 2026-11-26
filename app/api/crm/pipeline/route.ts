import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  return NextResponse.json({
    stages: ["New Lead", "Qualified", "Contacted", "Replied", "Meeting", "Proposal", "Won", "Lost"],
    kanban: {},
    total_deals: 0,
    pipeline_value: 0,
    won_revenue: 0,
  });
}
