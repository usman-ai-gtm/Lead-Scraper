import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  getWorkspaceProfileForPersonalization,
  generateLeadPersonalizationBatch,
} from "@/lib/lead-personalizer";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }
    const subCheck = await verifyClientActiveSubscription(user, "cold_email");
    if (!subCheck.allowed) {
      return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const rl = await consumeRateLimit({
      bucket: "lead_personalize",
      identifier: String(workspaceId),
      limit: 20,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = await req.json().catch(() => ({}));
    const leadIds: number[] = Array.isArray(body.lead_ids)
      ? body.lead_ids.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0).slice(0, 25)
      : [];
    const inlineLeads: any[] = Array.isArray(body.leads) ? body.leads.slice(0, 25) : [];

    let targetLeads: any[] = [];
    if (leadIds.length > 0 && isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        targetLeads = await sql.query(
          "SELECT * FROM leads WHERE workspace_id = $1 AND id = ANY($2::int[])",
          [workspaceId, leadIds]
        );
      }
    }
    if (targetLeads.length === 0 && inlineLeads.length > 0) {
      targetLeads = inlineLeads;
    }

    if (targetLeads.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one lead_id or lead object to personalize." },
        { status: 400 }
      );
    }

    const profile = await getWorkspaceProfileForPersonalization(workspaceId);
    const batch = await generateLeadPersonalizationBatch(targetLeads, profile, {
      workspaceId,
      senderName: subCheck.userRecord?.full_name || user.full_name,
      outputLanguage: body.output_language,
      tone: body.tone,
      customInstruction: body.instruction,
      persistToDb: leadIds.length > 0,
    });

    return NextResponse.json({
      status: "success",
      used_business_profile: Boolean(profile),
      ...batch,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate personalized lead emails." },
      { status: 500 }
    );
  }
}
