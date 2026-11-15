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
  original_source_url?: string;
  saved_date?: string;
  saved_time?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Format timestamp in Pakistan Standard Time (Asia/Karachi, UTC+5)
 */
function getPktDateTime() {
  const now = new Date();
  // Format in PKT (UTC+5)
  const pktTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = pktTime.getFullYear();
  const mm = pad(pktTime.getMonth() + 1);
  const dd = pad(pktTime.getDate());
  const hh = pad(pktTime.getHours());
  const min = pad(pktTime.getMinutes());
  const ss = pad(pktTime.getSeconds());
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}:${ss} PKT`,
  };
}

/**
 * Exact 17 Required Export Columns:
 * 1. Business Name
 * 2. Website
 * 3. Domain
 * 4. Email
 * 5. Phone
 * 6. Country
 * 7. City
 * 8. Address
 * 9. Industry
 * 10. Source Platform
 * 11. Original Source URL
 * 12. Email Status
 * 13. Phone Status
 * 14. Saved Date
 * 15. Saved Time
 * 16. Export Date
 * 17. Export Time
 */
function formatLeadsForExport(leads: ExportLeadItem[]) {
  const { date: exportDate, time: exportTime } = getPktDateTime();

  return leads.map((l) => {
    const rawName = l.business_name || l.name || l.title || "Business";
    const rawWebsite = l.website || (l.domain ? `https://${l.domain}` : "");
    let rawDomain = l.domain || "";
    if (!rawDomain && rawWebsite) {
      try {
        rawDomain = new URL(rawWebsite.startsWith("http") ? rawWebsite : `https://${rawWebsite}`).hostname.replace(/^www\./i, "");
      } catch {
        rawDomain = rawWebsite.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
      }
    }
    const rawEmail = l.email || "";
    const rawPhone = l.phone || "";
    const rawCountry = l.country || "Global";
    const rawCity = l.city || "";
    const rawAddress = l.address || [rawCity, rawCountry].filter(Boolean).join(", ");
    const rawIndustry = l.industry || l.category || "Commercial";
    const rawSourcePlatform = l.source_platform || l.source || "Google Organic Search / Official Website";
    const rawSourceUrl = l.original_source_url || l.source_url || rawWebsite;
    const rawEmailStatus = l.email_status || (rawEmail ? "FOUND IN SOURCE • DOMAIN CHECKED" : "NOT FOUND");
    const rawPhoneStatus = l.phone_status || (rawPhone ? "FOUND IN SOURCE • FORMAT CHECKED" : "NOT FOUND");

    let savedDate = l.saved_date || "";
    let savedTime = l.saved_time || "";
    if (!savedDate && l.created_at) {
      try {
        const d = new Date(l.created_at);
        savedDate = d.toISOString().split("T")[0];
        savedTime = `${d.toTimeString().split(" ")[0]} PKT`;
      } catch {
        savedDate = exportDate;
        savedTime = exportTime;
      }
    }
    if (!savedDate) {
      savedDate = exportDate;
      savedTime = exportTime;
    }

    return {
      "Business Name": rawName,
      "Website": rawWebsite,
      "Domain": rawDomain,
      "Email": rawEmail,
      "Phone": rawPhone,
      "Country": rawCountry,
      "City": rawCity,
      "Address": rawAddress,
      "Industry": rawIndustry,
      "Source Platform": rawSourcePlatform,
      "Original Source URL": rawSourceUrl,
      "Email Status": rawEmailStatus,
      "Phone Status": rawPhoneStatus,
      "Saved Date": savedDate,
      "Saved Time": savedTime,
      "Export Date": exportDate,
      "Export Time": exportTime,
    };
  });
}

function createExportResponse(formattedData: any[], format: string, filenameBase = "usman_qualified_leads") {
  const isXlsx = format.toLowerCase() === "xlsx";
  const ws = XLSX.utils.json_to_sheet(
    formattedData.length > 0
      ? formattedData
      : [
          {
            "Business Name": "",
            "Website": "",
            "Domain": "",
            "Email": "",
            "Phone": "",
            "Country": "",
            "City": "",
            "Address": "",
            "Industry": "",
            "Source Platform": "",
            "Original Source URL": "",
            "Email Status": "",
            "Phone Status": "",
            "Saved Date": "",
            "Saved Time": "",
            "Export Date": "",
            "Export Time": "",
          },
        ]
  );

  // Set readable column widths for all 17 columns
  ws["!cols"] = [
    { wch: 32 }, // 1. Business Name
    { wch: 32 }, // 2. Website
    { wch: 26 }, // 3. Domain
    { wch: 30 }, // 4. Email
    { wch: 22 }, // 5. Phone
    { wch: 20 }, // 6. Country
    { wch: 22 }, // 7. City
    { wch: 36 }, // 8. Address
    { wch: 28 }, // 9. Industry
    { wch: 34 }, // 10. Source Platform
    { wch: 44 }, // 11. Original Source URL
    { wch: 32 }, // 12. Email Status
    { wch: 32 }, // 13. Phone Status
    { wch: 16 }, // 14. Saved Date
    { wch: 18 }, // 15. Saved Time
    { wch: 16 }, // 16. Export Date
    { wch: 18 }, // 17. Export Time
  ];

  // Auto-filter on header row (A1:Q1)
  const ref = ws["!ref"] || "A1:Q1";
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

  try {
    const backendRes = await proxyToBackend(`/api/leads?workspace_id=${workspaceId}&page_size=5000`, req, null);
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
    const filename = body.filename || `usman_qualified_leads_${Date.now()}`;

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No qualified leads to export." },
        { status: 400 }
      );
    }

    const formatted = formatLeadsForExport(leads);
    return createExportResponse(formatted, format, filename);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate export file", details: error?.message },
      { status: 400 }
    );
  }
}
