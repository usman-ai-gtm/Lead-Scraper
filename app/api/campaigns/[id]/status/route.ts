import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonCampaignById, updateNeonCampaignProgress } from "@/lib/neon-db";
import { runCampaignInBackground } from "@/lib/campaign-runner";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(currentUser, "find_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const campaign = await getNeonCampaignById(params.id, workspaceId);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();

  switch (action) {
    case "PAUSE":
      await updateNeonCampaignProgress(params.id, workspaceId, { status: "PAUSED" });
      return NextResponse.json({ success: true, status: "PAUSED" });

    case "RESUME":
      await updateNeonCampaignProgress(params.id, workspaceId, { status: "RUNNING" });
      runCampaignInBackground(params.id, workspaceId).catch(console.error);
      return NextResponse.json({ success: true, status: "RUNNING" });

    case "CANCEL":
      await updateNeonCampaignProgress(params.id, workspaceId, { status: "CANCELLED" });
      return NextResponse.json({ success: true, status: "CANCELLED" });

    case "RETRY":
      await updateNeonCampaignProgress(params.id, workspaceId, {
        status: "RUNNING",
        error_message: "",
      });
      runCampaignInBackground(params.id, workspaceId).catch(console.error);
      return NextResponse.json({ success: true, status: "RUNNING" });

    default:
      return NextResponse.json({ error: "Invalid action. Supported: PAUSE, RESUME, CANCEL, RETRY" }, { status: 400 });
  }
}
