import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, getServerlessLeadsForDate } from "@/lib/serverless-auth";

export async function GET(req: Request, { params }: { params: { date: string } }) {
  const dateStr = decodeURIComponent(params.date);
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
    const leads = getServerlessLeadsForDate(workspaceId, dateStr);
    return {
      status: "success",
      workspace_id: workspaceId,
      date: dateStr,
      count: leads.length,
      leads
    };
  };

  return proxyToBackend(`/api/searches/date/${encodeURIComponent(dateStr)}/leads?workspace_id=${workspaceId}`, req, fallbackHandler);
}
