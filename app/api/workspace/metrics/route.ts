import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonClientDashboardMetrics, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = getCurrentUserFromRequest(request);
    const workspaceId = user ? user.workspace_id : 1;

    if (!isNeonConfigured()) {
      return NextResponse.json({
        workspace_id: workspaceId,
        total_leads_found: 0,
        saved_leads: 0,
        available_email_contacts: 0,
        available_phone_contacts: 0,
        connected_gmail_accounts: 0,
        emails_sent: 0,
        failed_emails: 0,
        remaining_quota: 5000,
        max_quota: 5000,
        contact_rate: 0,
      });
    }

    const metrics = await getNeonClientDashboardMetrics(workspaceId);
    return NextResponse.json(metrics || {
      workspace_id: workspaceId,
      total_leads_found: 0,
      saved_leads: 0,
      available_email_contacts: 0,
      available_phone_contacts: 0,
      connected_gmail_accounts: 0,
      emails_sent: 0,
      failed_emails: 0,
      remaining_quota: 5000,
      max_quota: 5000,
      contact_rate: 0,
    });
  } catch (err: any) {
    console.error("[Workspace Metrics GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load workspace metrics." },
      { status: 500 }
    );
  }
}
