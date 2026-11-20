import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
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

  const workspaceId = currentUser.workspace_id;
  const url = new URL(req.url);
  const keyword = url.searchParams.get("keyword") || "";
  const country = url.searchParams.get("country") || "Any";
  const city = url.searchParams.get("city") || "Any";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("page_size") || "50", 10);

  if (isNeonConfigured()) {
    const neonRes = await getNeonLeads(workspaceId, {
      keyword,
      country,
      city,
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
