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
  email_source_url?: string;
  email_status?: string;
  phone?: string;
  phone_source_url?: string;
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
  extraction_date?: string;
  extraction_time?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Format timestamp in Pakistan Standard Time (Asia/Karachi, UTC+5)
 */
function getPktDateTime() {
  const now = new Date();
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
 * 16 Required Export Columns:
 * 1. Business Name
 * 2. Website
 * 3. Domain
 * 4. Email
 * 5. Email Source URL
 * 6. Phone
 * 7. Phone Source URL
 * 8. Country
 * 9. City
 * 10. Industry
 * 11. Source Platform
 * 12. Original Source URL
 * 13. Email Evidence Status
 * 14. Phone Evidence Status
 * 15. Extraction Date
 * 16. Extraction Time
 */
function formatLeadsForExport(leads: ExportLeadItem[]) {
  const { date: defaultDate, time: defaultTime } = getPktDateTime();

  // Filter out any lead without a compulsory email address
  const validLeads = leads.filter((l) => {
    const em = l.email || "";
    return em.includes("@") && em.includes(".") && !em.toLowerCase().includes("not found");
  });

  return validLeads.map((l) => {
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
    const rawEmailSrc = l.email_source_url || l.original_source_url || rawWebsite;
    const rawPhone = l.phone || "";
    const rawPhoneSrc = rawPhone ? (l.phone_source_url || l.original_source_url || rawWebsite) : "Not Listed";
    const rawCountry = l.country || "Global";
    const rawCity = l.city || (l.address && !l.address.includes(",") ? l.address : "");
    const rawIndustry = l.industry || l.category || "Commercial";
    const rawSourcePlatform = l.source_platform || l.source || "Google Organic Search / Official Website";
    const rawSourceUrl = l.original_source_url || l.source_url || rawWebsite;
    const rawEmailStatus = l.email_status || (rawEmail ? "FOUND IN SOURCE • DOMAIN CHECKED" : "NOT FOUND");
    const rawPhoneStatus = l.phone_status || (rawPhone ? "FOUND IN SOURCE • FORMAT CHECKED" : "NOT LISTED");

    const extractionDate = l.extraction_date || l.saved_date || defaultDate;
    const extractionTime = l.extraction_time || l.saved_time || defaultTime;

    return {
      "Business Name": rawName,
      "Website": rawWebsite,
      "Domain": rawDomain,
      "Email": rawEmail,
      "Email Source URL": rawEmailSrc,
      "Phone": rawPhone || "Not Listed",
      "Phone Source URL": rawPhoneSrc,
      "Country": rawCountry,
      "City": rawCity || "Not Specified",
      "Industry": rawIndustry,
      "Source Platform": rawSourcePlatform,
      "Original Source URL": rawSourceUrl,
      "Email Evidence Status": rawEmailStatus,
      "Phone Evidence Status": rawPhoneStatus,
      "Extraction Date": extractionDate,
      "Extraction Time": extractionTime,
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
            "Email Source URL": "",
            "Phone": "",
            "Phone Source URL": "",
            "Country": "",
            "City": "",
            "Industry": "",
            "Source Platform": "",
            "Original Source URL": "",
            "Email Evidence Status": "",
            "Phone Evidence Status": "",
            "Extraction Date": "",
            "Extraction Time": "",
          },
        ]
  );

  // Set readable column widths for all 16 columns
  ws["!cols"] = [
    { wch: 32 }, // 1. Business Name
    { wch: 32 }, // 2. Website
    { wch: 26 }, // 3. Domain
    { wch: 30 }, // 4. Email
    { wch: 44 }, // 5. Email Source URL
    { wch: 22 }, // 6. Phone
    { wch: 44 }, // 7. Phone Source URL
    { wch: 20 }, // 8. Country
    { wch: 22 }, // 9. City
    { wch: 28 }, // 10. Industry
    { wch: 34 }, // 11. Source Platform
    { wch: 44 }, // 12. Original Source URL
    { wch: 36 }, // 13. Email Evidence Status
    { wch: 32 }, // 14. Phone Evidence Status
    { wch: 16 }, // 15. Extraction Date
    { wch: 18 }, // 16. Extraction Time
  ];

  // Auto-filter on header row (A1:P1)
  const ref = ws["!ref"] || "A1:P1";
  const range = XLSX.utils.decode_range(ref);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  // Add clickable hyperlinks in XLSX
  if (isXlsx && formattedData.length > 0) {
    for (let R = 1; R <= formattedData.length; R++) {
      // Column B: Website
      const bCell = XLSX.utils.encode_cell({ c: 1, r: R });
      if (ws[bCell] && typeof ws[bCell].v === "string" && ws[bCell].v.startsWith("http")) {
        ws[bCell].l = { Target: ws[bCell].v, Tooltip: ws[bCell].v };
      }
      // Column E: Email Source URL
      const eCell = XLSX.utils.encode_cell({ c: 4, r: R });
      if (ws[eCell] && typeof ws[eCell].v === "string" && ws[eCell].v.startsWith("http")) {
        ws[eCell].l = { Target: ws[eCell].v, Tooltip: ws[eCell].v };
      }
      // Column G: Phone Source URL
      const gCell = XLSX.utils.encode_cell({ c: 6, r: R });
      if (ws[gCell] && typeof ws[gCell].v === "string" && ws[gCell].v.startsWith("http")) {
        ws[gCell].l = { Target: ws[gCell].v, Tooltip: ws[gCell].v };
      }
      // Column L: Original Source URL
      const lCell = XLSX.utils.encode_cell({ c: 11, r: R });
      if (ws[lCell] && typeof ws[lCell].v === "string" && ws[lCell].v.startsWith("http")) {
        ws[lCell].l = { Target: ws[lCell].v, Tooltip: ws[lCell].v };
      }
    }
  }

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

  // CSV format with UTF-8 BOM so Excel opens characters cleanly
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

  const fallbackData: any[] = [];
  return proxyToBackend(`/api/leads/export?workspace_id=${workspaceId}&format=${format}`, req, fallbackData);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];
    const format = String(body.format || "xlsx").toLowerCase();
    const filename = String(body.filename || `usman_qualified_leads_${Date.now()}`);

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided for export." },
        { status: 400 }
      );
    }

    const formatted = formatLeadsForExport(leads);

    if (formatted.length === 0) {
      return NextResponse.json(
        { error: "No leads in the dataset met the compulsory email qualification criteria." },
        { status: 400 }
      );
    }

    return createExportResponse(formatted, format, filename);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Export processing failed." },
      { status: 500 }
    );
  }
}
