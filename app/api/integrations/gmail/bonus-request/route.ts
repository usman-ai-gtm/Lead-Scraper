import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import { createGmailBonusRequest, listWorkspaceBonusRequests } from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  const userId = Number(user.id || user.sub) || 0;
  const requests = await listWorkspaceBonusRequests(userId);
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }

  // Allow active or recently expired timed subscribers to request compensation (blocks unpurchased Free Preview)
  const subCheck = await verifyClientActiveSubscription(user);
  const rec = subCheck.userRecord;
  const planUpper = String(rec?.plan_type || rec?.plan || user.plan || "").toUpperCase();
  const acctUpper = String(rec?.account_type || user.account_type || "").toUpperCase();
  const isExpiredTimed = !subCheck.allowed && subCheck.statusCode === 403 && rec?.status === "EXPIRED";

  if ((!subCheck.allowed && !isExpiredTimed) || acctUpper === "FREE_PREVIEW" || planUpper === "FREE_PREVIEW") {
    return NextResponse.json(
      { detail: subCheck.message || "Only active or paid timed accounts can request Gmail setup compensation." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawQty = Number(body.quantity || body.requested_minutes || 0);
    const unit = String(body.unit || "minutes").toLowerCase();
    const requestedMinutes = unit === "hours" ? Math.round(rawQty * 60) : Math.round(rawQty);

    const requestRecord = await createGmailBonusRequest({
      userId: Number(rec?.id || user.id || user.sub),
      workspaceId: Number(rec?.workspace_id || user.workspace_id) || 1,
      username: String(rec?.username || user.username || user.email || "customer"),
      email: String(rec?.email || user.email || ""),
      planLabel: String(rec?.plan_label || planUpper || "Paid Plan"),
      requestedMinutes,
      reason: String(body.reason || ""),
    });

    return NextResponse.json({
      status: "success",
      verified: true,
      request: requestRecord,
      message: "Gmail setup time compensation request sent to the Owner for review.",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to submit bonus request." }, { status: 400 });
  }
}
