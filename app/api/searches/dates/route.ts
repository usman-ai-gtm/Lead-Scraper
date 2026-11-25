import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, verifyClientActiveSubscription, getServerlessSearchDates } from "@/lib/serverless-auth";
import { getNeonDistinctDates, isNeonConfigured } from "@/lib/neon-db";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonDates = await getNeonDistinctDates(workspaceId);
      if (neonDates && neonDates.length > 0) {
        return {
          status: "success",
          workspace_id: workspaceId,
          dates: neonDates,
        };
      }
    }

    const dates = getServerlessSearchDates(workspaceId);
    return {
      status: "success",
      workspace_id: workspaceId,
      dates,
    };
  };

  return proxyToBackend(`/api/searches/dates?workspace_id=${workspaceId}`, req, fallbackHandler);
}
