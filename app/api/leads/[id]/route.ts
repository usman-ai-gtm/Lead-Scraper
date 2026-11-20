import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonLeadById, deleteNeonLead, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }

  const id = Number(params.id);
  const workspaceId = currentUser.workspace_id;

  if (isNeonConfigured()) {
    const lead = await getNeonLeadById(workspaceId, id);
    if (lead) return NextResponse.json(lead);
  }

  return NextResponse.json({ detail: "Lead not found in this workspace" }, { status: 404 });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }

  const id = Number(params.id);
  const workspaceId = currentUser.workspace_id;

  if (isNeonConfigured()) {
    const deleted = await deleteNeonLead(workspaceId, id);
    if (deleted) {
      return NextResponse.json({
        status: "success",
        message: `Lead #${id} deleted successfully from workspace.`,
      });
    }
  }

  return NextResponse.json(
    { detail: "Lead not found or unauthorized to delete" },
    { status: 404 }
  );
}
