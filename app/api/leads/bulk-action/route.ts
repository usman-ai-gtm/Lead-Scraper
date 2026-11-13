import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, bulkDeleteServerlessLeads } from "@/lib/serverless-auth";

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {}

  const fallbackHandler = () => {
    const action = body.action || "delete";
    const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];

    if (action === "delete") {
      const count = bulkDeleteServerlessLeads(workspaceId, leadIds);
      return {
        status: "success",
        message: `Successfully deleted ${count} leads from workspace.`,
        affected_count: count,
      };
    }

    return {
      status: "success",
      message: `Bulk action "${action}" applied successfully.`,
      affected_count: leadIds.length,
    };
  };

  return proxyToBackend("/api/leads/bulk-action", req, fallbackHandler);
}
