import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonLeads, addNeonLead, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json(
      { detail: "Authentication required to access workspace leads." },
      { status: 401 }
    );
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;
  const url = new URL(req.url);
  const keyword = url.searchParams.get("keyword") || "";
  const country = url.searchParams.get("country") || "Any";
  const city = url.searchParams.get("city") || "Any";
  const searchName = url.searchParams.get("company") || url.searchParams.get("name") || url.searchParams.get("search_name") || "";
  const searchEmail = url.searchParams.get("email") || url.searchParams.get("search_email") || "";
  const source = url.searchParams.get("source") || "";
  const datePreset = url.searchParams.get("date_preset") || "";
  const dateFrom = url.searchParams.get("date_from") || "";
  const dateTo = url.searchParams.get("date_to") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("page_size") || "50", 10);

  if (isNeonConfigured()) {
    const neonRes = await getNeonLeads(workspaceId, {
      keyword,
      country,
      city,
      search_name: searchName,
      search_email: searchEmail,
      source,
      date_preset: datePreset,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      page_size: pageSize,
    });
    if (neonRes !== null) {
      return NextResponse.json(neonRes);
    }
  }

  return NextResponse.json({
    total: 0,
    leads: [],
    page,
    page_size: pageSize,
    total_pages: 1,
  });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json(
      { detail: "Authentication required to save workspace leads." },
      { status: 401 }
    );
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON payload" }, { status: 400 });
  }

  if (isNeonConfigured()) {
    const created = await addNeonLead(workspaceId, body);
    if (created) {
      return NextResponse.json({
        status: "success",
        lead_id: created.id,
        lead: created,
        message: "Lead saved permanently in Neon PostgreSQL.",
      });
    }
  }

  return NextResponse.json(
    { detail: "Failed to save lead to workspace database." },
    { status: 500 }
  );
}
