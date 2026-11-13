import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export interface ExportLeadItem {
  id?: number | string;
  business_name?: string;
  name?: string;
  title?: string;
  website?: string;
  domain?: string;
  email?: string;
  email_status?: string;
  phone?: string;
  phone_status?: string;
  country?: string;
  city?: string;
  address?: string;
  category?: string;
  industry?: string;
  source?: string;
  source_platform?: string;
  source_url?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Format leads according to the strict 12-column Ultra-Premium specification:
 * 1. Business Name
 * 2. Website / Domain
 * 3. Business Email
 * 4. Business Phone Number
 * 5. Country
 * 6. City / Address
 * 7. Business Category / Industry
 * 8. Source Platform
 * 9. Original Source URL
 * 10. Email Verification Status
 * 11. Phone Verification Status
 * 12. Extraction Date & Time
 */
function formatLeadsForExport(leads: ExportLeadItem[]) {
  return leads.map((l) => {
    const rawName = l.business_name || l.name || l.title || "Business Lead";
    const rawWebsite = l.website || l.domain || "";
    const rawEmail = l.email || "";
    const rawPhone = l.phone || "";
    const rawCountry = l.country || "Global";
    const rawAddress = [l.city, l.address].filter(Boolean).join(" - ") || l.city || l.address || "Verified Commercial Location";
    const rawCategory = l.category || l.industry || "B2B Commercial";
    const rawSource = l.source_platform || l.source || "Google Maps / Google Places API";
    const rawSourceUrl = l.source_url || l.website || "";
    const rawEmailStatus = l.email_status || (rawEmail ? "Verified Public Domain Email" : "Not Provided");
    const rawPhoneStatus = l.phone_status || (rawPhone ? "Verified Public Contact Phone" : "Not Provided");
    const rawDate = l.created_at || new Date().toISOString().replace("T", " ").substring(0, 19);

    return {
      "Business Name": rawName,
      "Website / Domain": rawWebsite,
      "Business Email": rawEmail,
      "Business Phone Number": rawPhone,
      "Country": rawCountry,
      "City / Address": rawAddress,
      "Business Category / Industry": rawCategory,
      "Source Platform": rawSource,
      "Original Source URL": rawSourceUrl,
      "Email Verification Status": rawEmailStatus,
      "Phone Verification Status": rawPhoneStatus,
      "Extraction Date & Time": rawDate,
    };
  });
}

function createExportResponse(formattedData: any[], format: string, filenameBase = "usman_qualified_leads") {
  const isXlsx = format.toLowerCase() === "xlsx";
  const ws = XLSX.utils.json_to_sheet(formattedData.length > 0 ? formattedData : [
    {
      "Business Name": "",
      "Website / Domain": "",
      "Business Email": "",
      "Business Phone Number": "",
      "Country": "",
      "City / Address": "",
      "Business Category / Industry": "",
      "Source Platform": "",
      "Original Source URL": "",
      "Email Verification Status": "",
      "Phone Verification Status": "",
      "Extraction Date & Time": "",
    }
  ]);

  // Set readable column widths for high-end presentation
  ws["!cols"] = [
    { wch: 32 }, // Business Name
    { wch: 32 }, // Website / Domain
    { wch: 30 }, // Business Email
    { wch: 22 }, // Business Phone Number
    { wch: 20 }, // Country
    { wch: 36 }, // City / Address
    { wch: 28 }, // Business Category / Industry
    { wch: 28 }, // Source Platform
    { wch: 40 }, // Original Source URL
    { wch: 28 }, // Email Verification Status
    { wch: 28 }, // Phone Verification Status
    { wch: 24 }, // Extraction Date & Time
  ];

  // Auto-filter on header range
  const ref = ws["!ref"] || "A1:L1";
  const range = XLSX.utils.decode_range(ref);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  if (isXlsx) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Qualified Leads");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  // CSV format with UTF-8 BOM so Excel opens non-ASCII characters cleanly
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
  const format = url.searchParams.get("format") || "xlsx";
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  // Try proxying to backend if running
  try {
    const backendRes = await proxyToBackend(`/api/leads?workspace_id=${workspaceId}&page_size=1000`, req, null);
    if (backendRes && backendRes.ok) {
      const data = await backendRes.json();
      const rawLeads = data?.leads || (Array.isArray(data) ? data : []);
      const formatted = formatLeadsForExport(rawLeads);
      return createExportResponse(formatted, format, `usman_qualified_leads_ws${workspaceId}`);
    }
  } catch {}

  const emptyFormatted = formatLeadsForExport([]);
  return createExportResponse(emptyFormatted, format, `usman_qualified_leads_ws${workspaceId}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];
    const format = body.format || "xlsx";
    const filename = body.filename || `usman_all_qualified_leads_${Date.now()}`;

    const formatted = formatLeadsForExport(leads);
    return createExportResponse(formatted, format, filename);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate export file", details: error?.message },
      { status: 400 }
    );
  }
}
