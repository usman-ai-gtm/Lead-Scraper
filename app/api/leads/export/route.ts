import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getCurrentUserFromRequest,
  verifyClientActiveSubscription,
  getPktDateTime,
  addServerlessExportHistory
} from "@/lib/serverless-auth";
import { recordNeonExport, isNeonConfigured } from "@/lib/neon-db";
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
  search_keyword?: string;
  saved_date?: string;
  saved_time?: string;
  extraction_date?: string;
  extraction_time?: string;
  created_at?: string;
  [key: string]: any;
}

function formatLeadsForXlsx(leads: ExportLeadItem[], meta?: any) {
  const pkt = getPktDateTime();
  const validLeads = leads.filter((l) => {
    const em = String(l.email || "").trim();
    const ph = String(l.phone || "").trim();
    const hasEmail = em.includes("@") && em.includes(".") && !em.toLowerCase().includes("not found");
    const hasPhone = Boolean(ph && ph !== "Not Listed" && ph !== "Not Found");
    return hasEmail || hasPhone || Boolean(l.business_name || l.name);
  });

  const seenKeys = new Set<string>();
  const rows: any[] = [];

  for (const l of validLeads) {
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
    const rawEmail = l.email && l.email !== "Not Found" ? l.email : "";
    const rawPhone = l.phone && l.phone !== "Not Found" ? l.phone : "Not Listed";
    const key = rawDomain
      ? rawDomain.toLowerCase()
      : `${rawName.toLowerCase()}|${rawEmail.toLowerCase()}|${rawPhone}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const rawOriginalSrc = l.original_source_url || l.source_url || rawWebsite;
    const rawEmailSrc = l.email_source_url || rawOriginalSrc;
    const rawPhoneSrc = rawPhone !== "Not Listed" ? (l.phone_source_url || rawOriginalSrc) : "Not Listed";
    const rawCountry = l.country || "Global";
    const rawCity = l.city || (l.address && !l.address.includes(",") ? l.address : "Not Specified");
    const rawIndustry = l.industry || l.category || "Commercial";
    const rawSourcePlatform = l.source_platform || l.source || "Google Organic Web Search";
    const searchKeyword = l.search_keyword || meta?.keyword || rawIndustry;
    const searchDate = l.search_date || l.extraction_date || l.saved_date || pkt.date_human;
    const searchTime = l.search_time || l.extraction_time || l.saved_time || pkt.time_human;
    const savedDate = l.saved_date || searchDate;
    const savedTime = l.saved_time || searchTime;

    rows.push({
      "Business Name": rawName,
      "Website": rawWebsite,
      "Domain": rawDomain,
      "Email": rawEmail,
      "Phone": rawPhone,
      "Country": rawCountry,
      "City": rawCity,
      "Industry": rawIndustry,
      "Source Platform": rawSourcePlatform,
      "Original Source URL": rawOriginalSrc,
      "Email Source URL": rawEmailSrc,
      "Phone Source URL": rawPhoneSrc,
      "Search Keyword": searchKeyword,
      "Search Date": searchDate,
      "Search Time": searchTime,
      "Saved Date": savedDate,
      "Saved Time": savedTime,
      "Export Date": pkt.date_human,
      "Export Time": pkt.time_human,
    });
  }

  return rows;
}

function buildXlsxResponse(formattedData: any[], filenameBase: string) {
  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Set calibrated column widths for all 19 columns
  ws["!cols"] = [
    { wch: 28 }, // 1. Business Name
    { wch: 28 }, // 2. Website
    { wch: 22 }, // 3. Domain
    { wch: 28 }, // 4. Email
    { wch: 18 }, // 5. Phone
    { wch: 16 }, // 6. Country
    { wch: 18 }, // 7. City
    { wch: 22 }, // 8. Industry
    { wch: 28 }, // 9. Source Platform
    { wch: 36 }, // 10. Original Source URL
    { wch: 36 }, // 11. Email Source URL
    { wch: 36 }, // 12. Phone Source URL
    { wch: 20 }, // 13. Search Keyword
    { wch: 18 }, // 14. Search Date
    { wch: 14 }, // 15. Search Time
    { wch: 18 }, // 16. Saved Date
    { wch: 14 }, // 17. Saved Time
    { wch: 18 }, // 18. Export Date
    { wch: 14 }, // 19. Export Time
  ];

  // Auto-filter on header row
  const ref = ws["!ref"] || "A1:S1";
  const range = XLSX.utils.decode_range(ref);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  // Clickable hyperlinks for Website, Original Source, Email Source, Phone Source
  for (let R = 1; R <= formattedData.length; R++) {
    // Col B: Website (c: 1)
    const bCell = XLSX.utils.encode_cell({ c: 1, r: R });
    if (ws[bCell] && typeof ws[bCell].v === "string" && ws[bCell].v.startsWith("http")) {
      ws[bCell].l = { Target: ws[bCell].v, Tooltip: ws[bCell].v };
    }
    // Col J: Original Source URL (c: 9)
    const jCell = XLSX.utils.encode_cell({ c: 9, r: R });
    if (ws[jCell] && typeof ws[jCell].v === "string" && ws[jCell].v.startsWith("http")) {
      ws[jCell].l = { Target: ws[jCell].v, Tooltip: ws[jCell].v };
    }
    // Col K: Email Source URL (c: 10)
    const kCell = XLSX.utils.encode_cell({ c: 10, r: R });
    if (ws[kCell] && typeof ws[kCell].v === "string" && ws[kCell].v.startsWith("http")) {
      ws[kCell].l = { Target: ws[kCell].v, Tooltip: ws[kCell].v };
    }
    // Col L: Phone Source URL (c: 11)
    const lCell = XLSX.utils.encode_cell({ c: 11, r: R });
    if (ws[lCell] && typeof ws[lCell].v === "string" && ws[lCell].v.startsWith("http")) {
      ws[lCell].l = { Target: ws[lCell].v, Tooltip: ws[lCell].v };
    }
  }

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

function buildPdfResponse(leads: ExportLeadItem[], filenameBase: string, meta?: any) {
  const pkt = getPktDateTime();
  const validLeads = leads.filter((l) => {
    const em = String(l.email || "").trim();
    const ph = String(l.phone || "").trim();
    const hasEmail = em.includes("@") && em.includes(".") && !em.toLowerCase().includes("not found");
    const hasPhone = Boolean(ph && ph !== "Not Listed" && ph !== "Not Found");
    return hasEmail || hasPhone || Boolean(l.business_name || l.name);
  });

  // Landscape A4: 841.89 x 595.28 pt
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text("USMAN AI GTM — B2B Qualified Leads Intelligence Report", 24, 28);

  // Meta Info Card
  const keyword = meta?.keyword || "All Saved Leads";
  const searchDate = meta?.search_date || pkt.date_human;
  const searchTime = meta?.search_time || pkt.time_human;
  const totalCount = validLeads.length;
  const withPhoneCount = validLeads.filter(
    (l) => l.phone && l.phone !== "Not Listed" && l.phone !== "Not Found"
  ).length;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setFillColor(241, 245, 249); // #F1F5F9
  doc.rect(24, 36, pageWidth - 48, 20, "F");

  doc.setTextColor(51, 65, 85);
  doc.text(
    `Keyword: ${keyword}   |   Search Date: ${searchDate}   |   Search Time: ${searchTime} PKT   |   Total Leads: ${totalCount}   |   With Phone: ${withPhoneCount}   |   Export Time: ${pkt.time_human} PKT`,
    32,
    49
  );

  const tableHeaders = [
    ["#", "Business Name", "Website & Domain", "Email (Syntax Checked)", "Corporate Phone", "Location & Industry", "Source & URL"]
  ];

  const seenKeys = new Set<string>();
  const tableData: any[] = [];
  let rowIdx = 1;

  for (const l of validLeads) {
    const rawName = l.business_name || l.name || "Business";
    const rawWebsite = l.website || (l.domain ? `https://${l.domain}` : "");
    const rawDomain = l.domain || "";
    const rawEmail = l.email && l.email !== "Not Found" ? l.email : "Not Listed";
    const rawPhone = l.phone && l.phone !== "Not Found" ? l.phone : "Not Listed";
    const key = rawDomain
      ? rawDomain.toLowerCase()
      : `${rawName.toLowerCase()}|${rawEmail.toLowerCase()}|${rawPhone}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const rawCountry = l.country || "Global";
    const rawCity = l.city || "";
    const locStr = rawCity ? `${rawCity}, ${rawCountry}` : rawCountry;
    const rawIndustry = l.industry || l.category || "Commercial";
    const rawSource = l.source_platform || l.source || "Google Organic Search";
    const rawUrl = l.original_source_url || l.source_url || rawWebsite;
    const emailStatus = l.email_status || "FOUND IN SOURCE";

    tableData.push([
      String(rowIdx),
      rawName,
      rawWebsite ? `${rawDomain || rawWebsite}\n${rawWebsite}` : (rawDomain || "N/A"),
      `${rawEmail}\n[${emailStatus}]`,
      rawPhone,
      `${locStr}\n${rawIndustry}`,
      `${rawSource}\n${rawUrl}`
    ]);
    rowIdx++;
  }

  // Generate table with autoTable
  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 64,
    margin: { left: 24, right: 24, top: 24, bottom: 32 },
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 4,
    },
    styles: {
      fontSize: 7,
      cellPadding: 3.5,
      overflow: "linebreak",
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },  // #
      1: { cellWidth: 120, fontStyle: "bold" }, // Business Name
      2: { cellWidth: 120, textColor: [2, 132, 199] }, // Website
      3: { cellWidth: 165 },                  // Email
      4: { cellWidth: 95 },                   // Phone
      5: { cellWidth: 105 },                  // Location
      6: { cellWidth: 160 },                  // Source URL
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Draw professional landscape footer
      const pageNumber = data.pageNumber;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      // Top border line for footer
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(24, pageHeight - 20, pageWidth - 24, pageHeight - 20);

      doc.text("USMAN AI GTM • Confidential B2B Qualified Lead Intelligence", 24, pageHeight - 9);
      doc.text(
        `Page ${pageNumber} of ${doc.getNumberOfPages()}`,
        pageWidth - 65,
        pageHeight - 9
      );
    },
  });

  const pdfOutput = doc.output("arraybuffer");
  const buffer = Buffer.from(pdfOutput);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const authCheck = await verifyClientActiveSubscription(currentUser, "exports");
  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: authCheck.message },
      { status: authCheck.statusCode || 403 }
    );
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "xlsx").toLowerCase();

  if (format === "csv") {
    return NextResponse.json(
      { error: "CSV export has been discontinued. Only Excel (XLSX) and PDF formats are supported." },
      { status: 400 }
    );
  }

  const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser?.workspace_id) || 1;

  const fallbackData: any[] = [];
  return proxyToBackend(
    `/api/leads/export?workspace_id=${workspaceId}&format=${format}`,
    req,
    fallbackData
  );
}

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUserFromRequest(req);
    const authCheck = await verifyClientActiveSubscription(currentUser, "exports");
    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.message },
        { status: authCheck.statusCode || 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const leads = Array.isArray(body.leads) ? body.leads : [];
    const format = String(body.format || "xlsx").toLowerCase();
    const filename = String(body.filename || `USMAN_AI_LEADS_${Date.now()}`);
    const meta = body.meta || {};

    // Strict Guard: Reject CSV completely!
    if (format === "csv") {
      return NextResponse.json(
        { error: "CSV export has been discontinued. Please export in Excel (.xlsx) or PDF format." },
        { status: 400 }
      );
    }

    if (format !== "xlsx" && format !== "pdf") {
      return NextResponse.json(
        { error: `Unsupported format '${format}'. Only 'xlsx' and 'pdf' are permitted.` },
        { status: 400 }
      );
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No qualified leads available for export." },
        { status: 400 }
      );
    }

    const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser?.workspace_id) || 1;

    // Record export history in background
    if (isNeonConfigured()) {
      recordNeonExport(
        workspaceId,
        currentUser ? currentUser.id : 1,
        meta.export_target || (meta.keyword ? `Search: ${meta.keyword}` : "Workspace Leads"),
        format.toUpperCase(),
        leads.length,
        meta.search_record_id,
        meta.search_date
      ).catch((err) => console.error("Neon export log error:", err));
    }

    addServerlessExportHistory(workspaceId, {
      export_target: meta.export_target || (meta.keyword ? `Search: ${meta.keyword}` : "Workspace Leads"),
      format: format.toUpperCase(),
      record_count: leads.length,
      search_record_id: meta.search_record_id,
      export_date_filter: meta.search_date,
    });

    if (format === "xlsx") {
      const formatted = formatLeadsForXlsx(leads, meta);
      if (formatted.length === 0) {
        return NextResponse.json(
          { error: "No leads in this dataset met the compulsory email qualification criteria." },
          { status: 400 }
        );
      }
      return buildXlsxResponse(formatted, filename);
    } else {
      return buildPdfResponse(leads, filename, meta);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Export processing failed." },
      { status: 500 }
    );
  }
}
