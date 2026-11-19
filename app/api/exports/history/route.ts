import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import {
  getCurrentUserFromRequest,
  getServerlessExportHistory,
  addServerlessExportHistory
} from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = () => {
    const history = getServerlessExportHistory(workspaceId);
    return {
      status: "success",
      workspace_id: workspaceId,
      count: history.length,
      history
    };
  };

  return proxyToBackend(`/api/exports/history?workspace_id=${workspaceId}`, req, fallbackHandler);
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {}

  const fallbackHandler = () => {
    const entry = addServerlessExportHistory(workspaceId, {
      export_target: body.export_target || "All Saved Leads",
      format: body.format || "XLSX",
      record_count: Number(body.record_count) || 0,
      search_record_id: body.search_record_id,
      export_date_filter: body.export_date_filter
    });
    return {
      status: "success",
      message: "Export logged successfully",
      entry
    };
  };

  return proxyToBackend("/api/exports/history", req, fallbackHandler);
}
