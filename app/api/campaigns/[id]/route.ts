import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonCampaignById, deleteNeonCampaign } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(
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
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(currentUser, "find_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const success = await deleteNeonCampaign(params.id, workspaceId);

  return NextResponse.json({ success });
}
