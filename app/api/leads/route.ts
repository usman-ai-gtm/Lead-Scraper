import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, getServerlessLeads, addServerlessLead } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = url.searchParams.get("keyword") || "";
  const country = url.searchParams.get("country") || "Any";
  const city = url.searchParams.get("city") || "Any";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("page_size") || "50", 10);

  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
    return getServerlessLeads(workspaceId, {
      keyword,
      country,
      city,
      page,
      page_size: pageSize,
    });
  };

  return proxyToBackend(`/api/leads?workspace_id=${workspaceId}`, req, fallbackHandler);
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {}

  const fallbackHandler = () => {
    const created = addServerlessLead(workspaceId, body);
    return {
      status: "success",
      lead_id: created.id,
      lead: created,
      message: "Lead saved successfully to workspace."
    };
  };

  return proxyToBackend("/api/leads", req, fallbackHandler);
}
