import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonCampaignById, deleteNeonCampaign } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const workspaceId = currentUser.workspace_id || 1;
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
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const workspaceId = currentUser.workspace_id || 1;
  const success = await deleteNeonCampaign(params.id, workspaceId);

  return NextResponse.json({ success });
}
