import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) {
    return NextResponse.json({
      status: "success",
      metrics: {
        total_leads_with_phone: 0,
        drafts_prepared: 0,
        chats_opened: 0,
        marked_sent: 0,
        replies_recorded: 0,
        suppressed_contacts: 0,
      },
      recent_activities: [],
      upcoming_followups: [],
    });
  }

  const [leadsAgg, actAgg, suppAgg, recentActs, followups] = await Promise.all([
    sql
      .query(
        `SELECT COUNT(*) AS cnt FROM leads
         WHERE workspace_id = $1 AND phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed'`,
        [workspaceId]
      )
      .catch(() => [{ cnt: 0 }]),
    sql
      .query(
        `SELECT
           COUNT(*) FILTER (WHERE action = 'DRAFT_PREPARED') AS drafts_prepared,
           COUNT(*) FILTER (WHERE action = 'CHAT_OPENED') AS chats_opened,
           COUNT(*) FILTER (WHERE action = 'MANUALLY_MARKED_SENT') AS marked_sent,
           COUNT(*) FILTER (WHERE action = 'REPLY_RECORDED') AS replies_recorded
         FROM whatsapp_activities
         WHERE workspace_id = $1`,
        [workspaceId]
      )
      .catch(() => [{}]),
    sql
      .query(`SELECT COUNT(*) AS cnt FROM whatsapp_suppressions WHERE workspace_id = $1`, [workspaceId])
      .catch(() => [{ cnt: 0 }]),
    sql
      .query(
        `SELECT * FROM whatsapp_activities WHERE workspace_id = $1 ORDER BY id DESC LIMIT 15`,
        [workspaceId]
      )
      .catch(() => []),
    sql
      .query(
        `SELECT * FROM whatsapp_activities
         WHERE workspace_id = $1 AND next_followup IS NOT NULL AND next_followup != ''
         ORDER BY next_followup ASC LIMIT 10`,
        [workspaceId]
      )
      .catch(() => []),
  ]);

  const agg: any = actAgg[0] || {};
  return NextResponse.json({
    status: "success",
    metrics: {
      total_leads_with_phone: parseInt(leadsAgg[0]?.cnt || "0", 10),
      drafts_prepared: parseInt(agg.drafts_prepared || "0", 10),
      chats_opened: parseInt(agg.chats_opened || "0", 10),
      marked_sent: parseInt(agg.marked_sent || "0", 10),
      replies_recorded: parseInt(agg.replies_recorded || "0", 10),
      suppressed_contacts: parseInt(suppAgg[0]?.cnt || "0", 10),
    },
    recent_activities: recentActs || [],
    upcoming_followups: followups || [],
  });
}
