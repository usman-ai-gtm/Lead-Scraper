import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import { reviewCustomerOAuthConfig } from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }

  const configId = parseInt(params.id, 10);
  if (Number.isNaN(configId) || configId <= 0) {
    return NextResponse.json({ detail: "Invalid OAuth config ID." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawAction = String(body.action || "").toUpperCase();
    const action = rawAction === "APPROVE" ? "APPROVE" : rawAction === "DISABLE" ? "DISABLE" : null;
    if (!action) {
      return NextResponse.json({ detail: "Action must be APPROVE or DISABLE." }, { status: 400 });
    }
    const updated = await reviewCustomerOAuthConfig(
      configId,
      action,
      { id: Number(user.id || user.sub) || 2, email: String(user.email || user.username || "master_owner") },
      body.admin_note
    );
    return NextResponse.json({ status: "success", verified: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to review custom OAuth config." }, { status: 400 });
  }
}
