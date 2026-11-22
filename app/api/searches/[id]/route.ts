import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import {
  getCurrentUserFromRequest,
  getServerlessSearchRecordById,
  verifyClientActiveSubscription,
} from "@/lib/serverless-auth";
import { getNeonSearchRecordById, isNeonConfigured } from "@/lib/neon-db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required to view search record." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const searchId = params.id;
  const workspaceId = currentUser.workspace_id || 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonRec = await getNeonSearchRecordById(workspaceId, searchId);
      if (neonRec) {
        return {
          status: "success",
          workspace_id: workspaceId,
          search_record: neonRec
        };
      }
    }

    const record = getServerlessSearchRecordById(workspaceId, searchId);
    if (!record) {
      return new Response(JSON.stringify({ error: "Search record not found" }), { status: 404 });
    }
    return {
      status: "success",
      workspace_id: workspaceId,
      search_record: record
    };
  };

  return proxyToBackend(`/api/searches/${encodeURIComponent(searchId)}?workspace_id=${workspaceId}`, req, fallbackHandler);
}
