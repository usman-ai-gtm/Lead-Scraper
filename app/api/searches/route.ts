import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import {
  getCurrentUserFromRequest,
  getServerlessSearchRecords,
  saveServerlessSearchRecordAndLeads,
  verifyClientActiveSubscription,
} from "@/lib/serverless-auth";
import {
  getNeonSearchRecords,
  saveNeonSearchRecordAndLeads,
  isNeonConfigured
} from "@/lib/neon-db";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required to view search records." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || undefined;
  const keyword = url.searchParams.get("keyword") || undefined;
  const workspaceId = currentUser.workspace_id || 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonRecords = await getNeonSearchRecords(workspaceId, date, keyword);
      if (neonRecords !== null) {
        return {
          status: "success",
          workspace_id: workspaceId,
          count: neonRecords.length,
          records: neonRecords
        };
      }
    }
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
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required to save search records." }, { status: 401 });
  }

  const authCheck = await verifyClientActiveSubscription(currentUser);
  if (!authCheck.allowed) {
    return NextResponse.json(
      { status: "error", message: authCheck.message },
      { status: authCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch { }

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonRecord = await saveNeonSearchRecordAndLeads(
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
      if (neonRecord !== null) {
        return {
          status: "success",
          message: "Search record and leads saved permanently in Neon PostgreSQL",
          search_record: neonRecord,
          count: (neonRecord.leads || []).length
        };
      }
    }

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
      search_record: record,
      count: ((record as any).leads || body.qualified_leads || []).length
    };
  };

  return proxyToBackend("/api/searches", req, fallbackHandler);
}
