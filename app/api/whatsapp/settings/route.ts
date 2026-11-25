import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql) {
    const rows = await sql
      .query(`SELECT * FROM whatsapp_companion_settings WHERE workspace_id = $1 LIMIT 1`, [workspaceId])
      .catch(() => []);
    if (rows?.[0]) {
      return NextResponse.json({ status: "success", settings: rows[0] });
    }
  }
  return NextResponse.json({
    status: "success",
    settings: {
      my_business_name: "USMAN AI GTM",
      my_offering: "B2B Lead Generation & Growth Solutions",
      value_proposition: "help businesses acquire qualified commercial clients",
      sender_name: subCheck.userRecord?.full_name || currentUser.full_name || "Sales Team",
      default_country_code: "92",
      default_tone: "Professional & Direct",
      auto_open_web: true,
    },
  });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) return NextResponse.json({ detail: subCheck.message }, { status: 403 });

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await req.json().catch(() => ({}));
  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (sql) {
    await sql.query(
      `INSERT INTO whatsapp_companion_settings (
        workspace_id, my_business_name, my_offering, value_proposition,
        sender_name, default_country_code, default_tone, auto_open_web, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (workspace_id) DO UPDATE SET
        my_business_name = EXCLUDED.my_business_name,
        my_offering = EXCLUDED.my_offering,
        value_proposition = EXCLUDED.value_proposition,
        sender_name = EXCLUDED.sender_name,
        default_country_code = EXCLUDED.default_country_code,
        default_tone = EXCLUDED.default_tone,
        auto_open_web = EXCLUDED.auto_open_web,
        updated_at = NOW()`,
      [
        workspaceId,
        String(body.my_business_name || "USMAN AI GTM"),
        String(body.my_offering || ""),
        String(body.value_proposition || ""),
        String(body.sender_name || ""),
        String(body.default_country_code || "92"),
        String(body.default_tone || "Professional & Direct"),
        Boolean(body.auto_open_web ?? true),
      ]
    );
  }
  return NextResponse.json({ status: "success", message: "Settings updated successfully" });
}
