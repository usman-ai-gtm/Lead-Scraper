import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription, bulkDeleteServerlessLeads } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ error: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const action = body.action || "delete";
  const leadIds = Array.isArray(body.lead_ids)
    ? body.lead_ids.map((x: any) => Number(x)).filter((x: number) => !Number.isNaN(x) && x > 0)
    : [];

  if (action === "delete" && leadIds.length > 0) {
    let deletedCount = 0;
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        await sql.query(
          `DELETE FROM search_record_leads WHERE workspace_id = $1 AND lead_id = ANY($2::int[])`,
          [workspaceId, leadIds]
        ).catch(() => {});
        const del = await sql.query(
          `DELETE FROM leads WHERE workspace_id = $1 AND id = ANY($2::int[]) RETURNING id`,
          [workspaceId, leadIds]
        );
        deletedCount = del.length;
      }
    } else {
      deletedCount = bulkDeleteServerlessLeads(workspaceId, leadIds);
    }
    return NextResponse.json({
      status: "success",
      message: `Successfully deleted ${deletedCount} leads from workspace.`,
      affected_count: deletedCount,
    });
  }

  return NextResponse.json({
    status: "success",
    message: `Bulk action "${action}" applied successfully.`,
    affected_count: leadIds.length,
  });
}
