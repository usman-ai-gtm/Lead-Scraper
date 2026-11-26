import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonLeads, isNeonConfigured, recordNeonExport } from "@/lib/neon-db";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import {
  ExportFormat,
  ExportMeta,
  normalizeLeadsForExport,
  buildXlsxBuffer,
  buildCsvBuffer,
  buildJsonBuffer,
  buildPdfBuffer,
} from "@/lib/export-formatter";

export const dynamic = "force-dynamic";

const ALLOWED_FORMATS: ExportFormat[] = ["xlsx", "pdf", "csv", "json"];

function parseFormat(raw: unknown): ExportFormat | null {
  const f = String(raw || "xlsx").trim().toLowerCase();
  return ALLOWED_FORMATS.includes(f as ExportFormat) ? (f as ExportFormat) : null;
}

function buildDownloadResponse(
  format: ExportFormat,
  rows: ReturnType<typeof normalizeLeadsForExport>,
  meta: ExportMeta,
  filenameBase: string,
  workspaceId: number
) {
  const safeName = filenameBase.replace(/[^a-zA-Z0-9._-]/g, "_") || `usman_ai_leads_ws${workspaceId}`;

  if (format === "csv") {
    const buf = buildCsvBuffer(rows);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.csv"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "json") {
    const buf = buildJsonBuffer(rows, meta, workspaceId);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.json"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    const buf = buildPdfBuffer(rows, meta);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  }

  const buf = buildXlsxBuffer(rows, meta);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "exports");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message || "Export access requires an active subscription." },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const userId = Number(subCheck.userRecord?.id || currentUser.id) || 1;

  const rl = await consumeRateLimit({
    bucket: "leads_export",
    identifier: String(workspaceId),
    limit: 30,
    windowSeconds: 300,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.retryAfterSeconds);
  }

  const url = new URL(req.url);
  const format = parseFormat(url.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported format. Allowed formats: xlsx, pdf, csv, json." },
      { status: 400 }
    );
  }

  const country = url.searchParams.get("country") || undefined;
  const keyword = url.searchParams.get("keyword") || undefined;

  let rawLeads: any[] = [];
  if (isNeonConfigured()) {
    const res = await getNeonLeads(workspaceId, {
      country: country && country !== "Any" ? country : undefined,
      keyword: keyword || undefined,
      page: 1,
      page_size: 5000,
    });
    rawLeads = res?.leads || [];
  }

  const meta: ExportMeta = {
    country: country || "All",
    keyword: keyword || "Workspace Export",
    export_target: "Workspace Saved Leads",
    workspace_id: workspaceId,
  };
  const normalized = normalizeLeadsForExport(rawLeads, meta);

  if (isNeonConfigured()) {
    await recordNeonExport(
      workspaceId,
      userId,
      meta.export_target || "Workspace Leads",
      format.toUpperCase(),
      normalized.length
    ).catch(() => {});
  }

  return buildDownloadResponse(
    format,
    normalized,
    meta,
    `usman_ai_leads_ws${workspaceId}_${Date.now()}`,
    workspaceId
  );
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "exports");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message || "Export access requires an active subscription." },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const userId = Number(subCheck.userRecord?.id || currentUser.id) || 1;

  const rl = await consumeRateLimit({
    bucket: "leads_export",
    identifier: String(workspaceId),
    limit: 30,
    windowSeconds: 300,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.retryAfterSeconds);
  }

  const body = await req.json().catch(() => ({}));
  const format = parseFormat(body.format);
  if (!format) {
    return NextResponse.json(
      {
        error: `Unsupported format '${String(body.format || "")}'. Permitted formats: xlsx, pdf, csv, json.`,
      },
      { status: 400 }
    );
  }

  const meta: ExportMeta = {
    ...(body.meta || {}),
    workspace_id: workspaceId,
  };

  let rawLeads: any[] = Array.isArray(body.leads) ? body.leads : [];
  if (rawLeads.length === 0 && isNeonConfigured()) {
    const res = await getNeonLeads(workspaceId, {
      country: meta.country && meta.country !== "Any" ? meta.country : undefined,
      keyword: meta.keyword || undefined,
      page: 1,
      page_size: 5000,
    });
    rawLeads = res?.leads || [];
  }

  const normalized = normalizeLeadsForExport(rawLeads, meta);

  if (isNeonConfigured()) {
    await recordNeonExport(
      workspaceId,
      userId,
      meta.export_target || "Workspace Leads",
      format.toUpperCase(),
      normalized.length,
      meta.search_record_id,
      meta.search_date
    ).catch(() => {});
  }

  const filenameBase = String(body.filename || `usman_ai_leads_ws${workspaceId}_${Date.now()}`);
  return buildDownloadResponse(format, normalized, meta, filenameBase, workspaceId);
}
