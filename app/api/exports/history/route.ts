import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import {
  getCurrentUserFromRequest,
  getServerlessExportHistory,
  addServerlessExportHistory,
  verifyClientActiveSubscription,
} from "@/lib/serverless-auth";
import {
  getNeonExportHistory,
  recordNeonExport,
  isNeonConfigured
} from "@/lib/neon-db";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required to view export history." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonHistory = await getNeonExportHistory(workspaceId);
      if (neonHistory !== null) {
        return {
          status: "success",
          workspace_id: workspaceId,
          count: neonHistory.length,
          history: neonHistory
        };
      }
    }

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
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required to record exports." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;
  const userId = currentUser.id || 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {}

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const rec = await recordNeonExport(
        workspaceId,
        userId,
        body.export_target || "All Saved Leads",
        body.format || "XLSX",
        Number(body.record_count) || 0,
        body.search_record_id,
        body.export_date_filter
      );
      if (rec) {
        return {
          status: "success",
          message: "Export logged permanently in Neon PostgreSQL",
          entry: rec[0] || rec
        };
      }
    }

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
