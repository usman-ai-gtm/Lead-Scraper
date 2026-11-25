import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, verifyClientActiveSubscription, getServerlessLeadsForDate } from "@/lib/serverless-auth";

export async function GET(req: Request, { params }: { params: { date: string } }) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const dateStr = decodeURIComponent(params.date);

  const fallbackHandler = () => {
    const leads = getServerlessLeadsForDate(workspaceId, dateStr);
    return {
      status: "success",
      workspace_id: workspaceId,
      date: dateStr,
      count: leads.length,
      leads,
    };
  };

  return proxyToBackend(`/api/searches/date/${encodeURIComponent(dateStr)}/leads?workspace_id=${workspaceId}`, req, fallbackHandler);
}
