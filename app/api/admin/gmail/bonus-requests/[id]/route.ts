import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import { reviewGmailBonusRequest } from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }

  const reqId = parseInt(params.id, 10);
  if (Number.isNaN(reqId) || reqId <= 0) {
    return NextResponse.json({ detail: "Invalid bonus request ID." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawAction = String(body.action || "").toUpperCase();
    const action = rawAction === "APPROVE" ? "APPROVE" : rawAction === "REJECT" ? "REJECT" : null;
    if (!action) {
      return NextResponse.json({ detail: "Action must be APPROVE or REJECT." }, { status: 400 });
    }

    const rawAmount = body.bonus_value !== undefined ? Number(body.bonus_value) : undefined;
    const bonusUnit = String(body.bonus_unit || "minutes").toLowerCase();
    const approvedMinutes =
      rawAmount !== undefined && Number.isFinite(rawAmount) && rawAmount > 0
        ? bonusUnit === "hours"
          ? Math.round(rawAmount * 60)
          : Math.round(rawAmount)
        : body.approved_minutes !== undefined
        ? Math.round(Number(body.approved_minutes))
        : undefined;

    const result = await reviewGmailBonusRequest(
      reqId,
      action,
      {
        id: Number(user.id || user.sub) || 2,
        email: String(user.email || user.username || "master_owner"),
        username: user.username,
      },
      {
        approved_minutes: approvedMinutes,
        admin_note: body.admin_note,
      }
    );

    return NextResponse.json({
      status: "success",
      verified: true,
      request: result.request,
      client: result.client,
      message:
        action === "APPROVE"
          ? `Bonus request #${reqId} approved (+${result.request.approved_minutes} minutes) and verified on account.`
          : `Bonus request #${reqId} rejected.`,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to process bonus request." }, { status: 400 });
  }
}
