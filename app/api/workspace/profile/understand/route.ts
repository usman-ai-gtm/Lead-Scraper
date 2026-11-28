import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { understandBusinessInput } from "@/lib/business-profile-ai";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }
    const subCheck = await verifyClientActiveSubscription(user, "business_profile");
    if (!subCheck.allowed) {
      return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const rl = await consumeRateLimit({
      bucket: "profile_understand",
      identifier: String(workspaceId),
      limit: 25,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.slice(0, 6000) : "";
    const languageHint = typeof body.languageHint === "string" ? body.languageHint : "auto";
    const existingProfile =
      body.existingProfile && typeof body.existingProfile === "object"
        ? body.existingProfile
        : null;

    const extracted = await understandBusinessInput({
      text,
      languageHint,
      existingProfile,
    });

    return NextResponse.json({
      status: "success",
      extracted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Unable to understand business description." },
      { status: 500 }
    );
  }
}
