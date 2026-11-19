import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, getServerlessSearchRecordById } from "@/lib/serverless-auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const searchId = params.id;
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
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
