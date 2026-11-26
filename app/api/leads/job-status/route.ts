import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonActiveSearchJob, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user, "find_leads");
    if (!subCheck.allowed) {
      return NextResponse.json(
        { error: subCheck.message || "Authentication required" },
        { status: subCheck.statusCode || 403 }
      );
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    if (!isNeonConfigured()) {
      return NextResponse.json({ is_running: false, active_job: null });
    }

    const activeJob = await getNeonActiveSearchJob(workspaceId);
    return NextResponse.json({
      is_running: Boolean(activeJob),
      active_job: activeJob || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to check job status" }, { status: 500 });
  }
}
