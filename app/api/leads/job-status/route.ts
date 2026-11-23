import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonActiveSearchJob, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;
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
