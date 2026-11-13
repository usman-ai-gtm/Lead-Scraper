import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

interface ExportLeadItem {
  id?: number | string;
  business_name?: string;
  industry?: string;
  category?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  website?: string;
  email?: string;
  email_status?: string;
  phone?: string;
  phone_status?: string;
  whatsapp_number?: string;
  social_links?: Record<string, string> | string;
  description?: string;
  services?: string;
  lead_score?: number;
  source?: string;
  source_url?: string;
  created_at?: string;
  [key: string]: any;
}

function formatLeadsForExport(leads: ExportLeadItem[]) {
  return leads.map((l, index) => {
    let socialStr = "";
    if (typeof l.social_links === "object" && l.social_links !== null) {
      socialStr = Object.entries(l.social_links)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    } else if (typeof l.social_links === "string") {
      socialStr = l.social_links;
    }

    return {
      "ID": l.id || index + 1,
      "Business Name": l.business_name || l.name || "N/A",
      "Industry": l.industry || "General",
      "Category": l.category || "General",
      "Country": l.country || "Unspecified",
      "State / Province": l.state || "",
      "City": l.city || "",
      "Address": l.address || "",
      "Website": l.website || "",
      "Public Email": l.email || "Not Found",
      "Email Verification": l.email_status || (l.email ? "UNVERIFIED" : "NOT FOUND"),
      "Public Phone": l.phone || "Not Found",
      "WhatsApp Number": l.whatsapp_number || l.phone || "",
      "Social Profiles": socialStr || "",
      "Description": l.description || "",
      "Services": l.services || "",
      "Lead Score": l.lead_score || l.final_lead_score || 70,
      "Discovery Source": l.source || "Web Public Data",
      "Source URL": l.source_url || "",
      "Extraction Date": l.created_at || new Date().toISOString()
    };
  });
}

function createExportResponse(formattedData: any[], format: string, filenameBase = "usman_ai_leads") {
  const isXlsx = format.toLowerCase() === "xlsx";
  const ws = XLSX.utils.json_to_sheet(formattedData);

  if (isXlsx) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "B2B Leads");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  // CSV format with UTF-8 BOM so Excel opens non-ASCII characters without mangling
  const csvContent = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  // Try proxying to backend if running
  try {
    const backendRes = await proxyToBackend(`/api/leads?workspace_id=${workspaceId}&page_size=1000`, req, null);
    if (backendRes && backendRes.ok) {
      const data = await backendRes.json();
      const rawLeads = data?.leads || (Array.isArray(data) ? data : []);
      const formatted = formatLeadsForExport(rawLeads);
      return createExportResponse(formatted, format, `usman_ai_leads_ws${workspaceId}`);
    }
  } catch {}

  // Fallback / Serverless mode (honest empty export structure if no saved leads)
  const emptyFormatted = formatLeadsForExport([]);
  return createExportResponse(emptyFormatted, format, `usman_ai_leads_ws${workspaceId}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];
    const format = body.format || "csv";
    const filename = body.filename || `usman_ai_leads_export_${Date.now()}`;

    const formatted = formatLeadsForExport(leads);
    return createExportResponse(formatted, format, filename);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate export file", details: error?.message },
      { status: 400 }
    );
  }
}
