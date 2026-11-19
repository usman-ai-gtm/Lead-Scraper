import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import {
  getCurrentUserFromRequest,
  getServerlessSearchRecords,
  saveServerlessSearchRecordAndLeads
} from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || undefined;
  const keyword = url.searchParams.get("keyword") || undefined;

  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
    const records = getServerlessSearchRecords(workspaceId, date, keyword);
    return {
      status: "success",
      workspace_id: workspaceId,
      count: records.length,
      records
    };
  };

  const queryParams = new URLSearchParams();
  queryParams.set("workspace_id", String(workspaceId));
  if (date) queryParams.set("date", date);
  if (keyword) queryParams.set("keyword", keyword);

  return proxyToBackend(`/api/searches?${queryParams.toString()}`, req, fallbackHandler);
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {}

  const fallbackHandler = () => {
    const record = saveServerlessSearchRecordAndLeads(
      workspaceId,
      {
        keyword: body.keyword || "General",
        country: body.country || "Global",
        city: body.city || "",
        sources: body.sources || [],
        requested_quantity: body.requested_quantity || (body.qualified_leads?.length || 0),
        search_record_id: body.search_record_id,
      },
      body.qualified_leads || []
    );
    return {
      status: "success",
      message: "Search record and leads saved successfully (serverless mode)",
      search_record: record
    };
  };

  return proxyToBackend("/api/searches", req, fallbackHandler);
}
