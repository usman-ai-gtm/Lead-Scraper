import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

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

  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  let gmailConnected = false;

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      const rows = await sql.query(
        `SELECT COUNT(*)::int AS cnt FROM email_accounts WHERE workspace_id = $1 AND is_active = 1`,
        [workspaceId]
      ).catch(() => []);
      gmailConnected = Number(rows?.[0]?.cnt || 0) > 0;
    }
  }

  return NextResponse.json({
    integrations: [
      {
        id: "google",
        name: "Google Workspace & Gmail OAuth 2.0",
        category: "Email & Identity",
        status: gmailConnected ? "CONNECTED" : "NOT_CONNECTED",
        icon: "mail",
      },
      {
        id: "serper",
        name: "Serper Web & Google Places Search",
        category: "Lead Discovery",
        status: process.env.SERPER_API_KEY ? "CONFIGURED" : "NOT_CONFIGURED",
        icon: "search",
      },
      {
        id: "gemini",
        name: "Google Gemini AI",
        category: "Research & Copywriting",
        status: process.env.GEMINI_API_KEY ? "CONFIGURED" : "NOT_CONFIGURED",
        icon: "sparkles",
      },
    ],
  });
}
