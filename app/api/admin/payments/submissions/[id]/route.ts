import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import { reviewPaymentSubmission } from "@/lib/payments-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner authorization required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }

  const subId = parseInt(params.id, 10);
  if (Number.isNaN(subId) || subId <= 0) {
    return NextResponse.json({ detail: "Invalid submission ID." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawAction = String(body.action || "").toUpperCase();
    const action: "APPROVE" | "REJECT" | "MORE_INFO_REQUIRED" | null =
      rawAction === "APPROVE"
        ? "APPROVE"
        : rawAction === "REJECT"
        ? "REJECT"
        : rawAction === "MORE_INFO_REQUIRED"
        ? "MORE_INFO_REQUIRED"
        : null;
    if (!action) {
      return NextResponse.json(
        { detail: "Invalid action. Supported: APPROVE, REJECT, MORE_INFO_REQUIRED." },
        { status: 400 }
      );
    }

    const result = await reviewPaymentSubmission(
      subId,
      action,
      {
        id: Number(user.id || user.sub) || 2,
        email: String(user.email || user.username || "master_owner"),
        username: user.username,
      },
      {
        admin_notes: body.admin_notes,
        target_plan: body.target_plan,
        duration_value: body.duration_value,
        duration_unit: body.duration_unit,
        features: body.features,
        daily_email_limit: body.daily_email_limit,
        agreed_price_usd: body.agreed_price_usd,
      }
    );

    return NextResponse.json({
      status: "success",
      verified: true,
      submission: result.submission,
      client: result.client,
      message:
        action === "APPROVE"
          ? `Payment #${subId} approved and existing client #${result.client?.id} (${result.submission.username}) updated in database.`
          : `Payment #${subId} marked as ${result.submission.status}.`,
    });
  } catch (err: any) {
    console.error("[Admin Payment Review POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to review payment submission." },
      { status: 400 }
    );
  }
}
