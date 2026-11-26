import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  getOwnerSupportEmail,
  getOfficialWhatsAppNumber,
  listPaymentMethods,
} from "@/lib/payments-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }

    if (isNeonConfigured() && !isAuthorizedOwner(user)) {
      const sql = getNeonSql();
      const userId = Number(user.id || user.sub) || 0;
      if (sql && userId > 0) {
        const rows = await sql.query(
          "SELECT id, COALESCE(session_version, 1) AS session_version FROM users WHERE id = $1 LIMIT 1",
          [userId]
        );
        if (!rows || rows.length === 0) {
          return NextResponse.json({ detail: "User account not found." }, { status: 401 });
        }
        const tokenSv = user.sv != null ? Number(user.sv) : 1;
        if (tokenSv !== Number(rows[0].session_version || 1)) {
          return NextResponse.json({ detail: "Session invalidated." }, { status: 401 });
        }
      }
    }

    const supportEmail = getOwnerSupportEmail();
    const whatsappNumber = getOfficialWhatsAppNumber();
    const methods = isNeonConfigured() ? await listPaymentMethods(false) : [];

    return NextResponse.json({
      support_email: supportEmail,
      support_email_configured: Boolean(supportEmail),
      whatsapp_number: whatsappNumber,
      methods,
    });
  } catch (err: any) {
    console.error("[Payments Config GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load payment configuration." },
      { status: 500 }
    );
  }
}
