import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  if (params.id === "google" && isNeonConfigured()) {
    const sql = getNeonSql();
    const rows = sql
      ? await sql.query(
          `SELECT id, sender_email, health_status FROM email_accounts WHERE workspace_id = $1 AND is_active = 1 LIMIT 5`,
          [workspaceId]
        ).catch(() => [])
      : [];
    return NextResponse.json({
      status: rows.length > 0 ? "CONNECTED" : "NOT_CONNECTED",
      connector_id: params.id,
      accounts: rows,
    });
  }

  return NextResponse.json(
    {
      status: "unsupported",
      connector_id: params.id,
      error: `Connector '${params.id}' is not enabled in serverless mode.`,
    },
    { status: 404 }
  );
}
