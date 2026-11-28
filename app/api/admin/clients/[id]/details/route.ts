import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonClientFullProfile, isNeonConfigured } from "@/lib/neon-db";
import { ensureGoogleTrackingColumns } from "@/lib/preview-conversion";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * Owner-only Complete Client Activity & Intelligence API.
 * Strictly enforces Master Owner role and never returns password hashes or OAuth secrets.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Only Master Owner may view full client intelligence." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId) || clientId <= 0) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }

    await ensureGoogleTrackingColumns();
    const profile = await getNeonClientFullProfile(clientId);
    if (!profile) {
      return NextResponse.json({ detail: "Client account not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "success", ...profile });
  } catch (err: any) {
    console.error("[Owner Client Details API] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load client details." },
      { status: 500 }
    );
  }
}
