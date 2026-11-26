import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonClientDashboardMetrics, getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    let workspaceId = Number(user.workspace_id) || 1;
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql && user.id) {
        const uRows = await sql
          .query(
            `SELECT workspace_id, status, role, account_type, COALESCE(session_version, 1) AS session_version
             FROM users WHERE id = $1 LIMIT 1`,
            [Number(user.id)]
          )
          .catch(() => []);
        if (!uRows || uRows.length === 0) {
          return NextResponse.json({ detail: "User not found" }, { status: 401 });
        }
        const u = uRows[0];
        const tokenSv = user.sv != null ? Number(user.sv) : 1;
        const isOwner =
          ["ADMIN", "SUPER_ADMIN"].includes(String(u.role || "").toUpperCase()) ||
          String(u.account_type || "").toUpperCase() === "MASTER_OWNER";
        if (!isOwner && tokenSv !== Number(u.session_version || 1)) {
          return NextResponse.json({ detail: "Session invalidated" }, { status: 401 });
        }
        if (!isOwner && ["SUSPENDED", "REVOKED"].includes(String(u.status || "").toUpperCase())) {
          return NextResponse.json({ detail: "Account suspended or revoked" }, { status: 403 });
        }
        if (u.workspace_id) {
          workspaceId = Number(u.workspace_id);
        }
      }
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({
        workspace_id: workspaceId,
        total_leads_found: 0,
        saved_leads: 0,
        leads_with_email: 0,
        leads_with_phone: 0,
        leads_with_both_contacts: 0,
        available_email_contacts: 0,
        available_phone_contacts: 0,
        connected_gmail_accounts: 0,
        emails_sent: 0,
        emails_sent_today: 0,
        daily_email_limit: 10,
        failed_emails: 0,
        remaining_quota: 5000,
        max_quota: 5000,
        contact_rate: 0,
      });
    }

    const metrics = await getNeonClientDashboardMetrics(workspaceId);
    return NextResponse.json(
      metrics || {
        workspace_id: workspaceId,
        total_leads_found: 0,
        saved_leads: 0,
        leads_with_email: 0,
        leads_with_phone: 0,
        leads_with_both_contacts: 0,
        available_email_contacts: 0,
        available_phone_contacts: 0,
        connected_gmail_accounts: 0,
        emails_sent: 0,
        emails_sent_today: 0,
        daily_email_limit: 10,
        failed_emails: 0,
        remaining_quota: 5000,
        max_quota: 5000,
        contact_rate: 0,
      }
    );
  } catch (err: any) {
    console.error("[Workspace Metrics GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load workspace metrics." },
      { status: 500 }
    );
  }
}
