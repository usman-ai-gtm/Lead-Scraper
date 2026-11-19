import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, getServerlessSearchDates } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
    const dates = getServerlessSearchDates(workspaceId);
    return {
      status: "success",
      workspace_id: workspaceId,
      dates
    };
  };

  return proxyToBackend(`/api/searches/dates?workspace_id=${workspaceId}`, req, fallbackHandler);
}
