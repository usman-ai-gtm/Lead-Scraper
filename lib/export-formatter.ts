import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { normalizePersistedEmailStatus, normalizePersistedPhoneStatus } from "@/lib/contact-taxonomy";

export type ExportFormat = "xlsx" | "pdf" | "csv" | "json";

export interface ExportMeta {
  keyword?: string;
  country?: string;
  city?: string;
  search_date?: string;
  search_time?: string;
  search_record_id?: string;
  export_target?: string;
  workspace_id?: number;
}

export interface NormalizedExportLead {
  business_name: string;
  website: string;
  domain: string;
  email: string;
  email_status: string;
  phone: string;
  phone_status: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  source_platform: string;
  original_source_url: string;
  email_source_url: string;
  phone_source_url: string;
  search_keyword: string;
  collection_timestamp: string;
  last_verified_at: string;
  saved_date: string;
  saved_time: string;
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) in Excel & CSV cells.
 * Any value whose raw or trimmed string starts with =, +, -, @, tab, or CR
 * is prefixed with a single quote so spreadsheet engines treat it strictly as text.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (!str) return "";
  if (/^[=+\-@\t\r]/.test(str) || /^[=+\-@\t\r]/.test(str.trimStart())) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes a single cell according to RFC 4180 after neutralizing formula payloads.
 */
export function escapeCsvCell(value: unknown): string {
  const safe = sanitizeSpreadsheetCell(value);
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function formatExportPkt(dateObj?: string | number | Date): { date: string; time: string } {
  const d = dateObj ? new Date(dateObj) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return formatExportPkt(now);
  }
  const datePart = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date: datePart, time: `${timePart} PKT` };
}

function normalizeUrlField(raw?: string | null): string {
  const val = String(raw || "").trim();
  if (!val || val === "Not Found" || val === "None") return "";
  return val;
}

function extractDomainField(rawDom?: string | null, rawWeb?: string | null): string {
  const src = String(rawDom || rawWeb || "").trim();
  if (!src || src === "Not Found") return "";
  return src
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .toLowerCase()
    .trim();
}

/**
 * Normalizes and deduplicates lead rows without dropping valid leads missing a domain.
 */
export function normalizeLeadsForExport(
  rawLeads: any[],
  meta: ExportMeta = {}
): NormalizedExportLead[] {
  const seenKeys = new Set<string>();
  const out: NormalizedExportLead[] = [];

  for (const lead of Array.isArray(rawLeads) ? rawLeads : []) {
    if (!lead || typeof lead !== "object") continue;

    const businessName = String(lead.business_name || lead.company_name || lead.name || "").trim();
    const emailRaw = String(lead.email || "").trim();
    const phoneRaw = String(lead.phone || "").trim();
    const website = normalizeUrlField(lead.website);
    const domain = extractDomainField(lead.domain, website);
    const address = String(lead.address || "").trim();

    if (!businessName && !emailRaw && !phoneRaw && !domain) continue;

    const dedupKey = domain
      ? `dom:${domain}`
      : emailRaw && emailRaw.includes("@")
      ? `em:${emailRaw.toLowerCase()}`
      : lead.place_id
      ? `pid:${String(lead.place_id).trim()}`
      : phoneRaw && !["Not Listed", "Not Found"].includes(phoneRaw)
      ? `ph:${phoneRaw.replace(/[^0-9+]/g, "")}`
      : `name:${businessName.toLowerCase()}::${address.toLowerCase()}`;

    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const emailClean = emailRaw.toLowerCase() === "not found" ? "" : emailRaw;
    const phoneClean = ["not found", "not listed", "none"].includes(phoneRaw.toLowerCase()) ? "" : phoneRaw;
    const emailStatus = normalizePersistedEmailStatus(lead.email_status, emailClean);
    const phoneStatus = normalizePersistedPhoneStatus(lead.phone_status, phoneClean);

    const createdIso = String(lead.collection_timestamp || lead.created_at || "").trim();
    const verifiedIso = String(lead.last_verified_at || lead.created_at || "").trim();
    const pkt = formatExportPkt(createdIso || undefined);

    out.push({
      business_name: businessName || domain || "Unnamed Entity",
      website: website || (domain ? `https://${domain}` : ""),
      domain,
      email: emailClean,
      email_status: emailStatus,
      phone: phoneClean,
      phone_status: phoneStatus,
      country: String(lead.country || meta.country || "").trim(),
      city: String(lead.city || meta.city || "").trim(),
      address,
      industry: String(lead.industry || lead.category || meta.keyword || "").trim(),
      source_platform: String(lead.source || lead.source_platform || "Web Discovery").trim(),
      original_source_url: normalizeUrlField(lead.original_source_url || lead.source_url || website),
      email_source_url: normalizeUrlField(lead.email_source_url || (emailClean ? website : "")),
      phone_source_url: normalizeUrlField(lead.phone_source_url || (phoneClean ? lead.source_url : "")),
      search_keyword: String(lead.search_keyword || meta.keyword || "").trim(),
      collection_timestamp: createdIso || new Date().toISOString(),
      last_verified_at: verifiedIso || createdIso || "",
      saved_date: String(lead.saved_date || lead.date_discovered || pkt.date).trim(),
      saved_time: String(lead.saved_time || lead.extraction_time || pkt.time).trim(),
    });
  }

  return out;
}

export function buildXlsxBuffer(rows: NormalizedExportLead[], meta: ExportMeta = {}): Buffer {
  const nowPkt = formatExportPkt();
  const sheetRows = rows.map((r, idx) => ({
    "#": idx + 1,
    "Business Name": sanitizeSpreadsheetCell(r.business_name),
    Website: sanitizeSpreadsheetCell(r.website),
    Domain: sanitizeSpreadsheetCell(r.domain),
    Email: sanitizeSpreadsheetCell(r.email),
    "Email Status": sanitizeSpreadsheetCell(r.email_status),
    Phone: sanitizeSpreadsheetCell(r.phone),
    "Phone Status": sanitizeSpreadsheetCell(r.phone_status),
    Country: sanitizeSpreadsheetCell(r.country),
    City: sanitizeSpreadsheetCell(r.city),
    Address: sanitizeSpreadsheetCell(r.address),
    Industry: sanitizeSpreadsheetCell(r.industry),
    "Source Platform": sanitizeSpreadsheetCell(r.source_platform),
    "Original Source URL": sanitizeSpreadsheetCell(r.original_source_url),
    "Email Source URL": sanitizeSpreadsheetCell(r.email_source_url),
    "Phone Source URL": sanitizeSpreadsheetCell(r.phone_source_url),
    "Search Keyword": sanitizeSpreadsheetCell(r.search_keyword),
    "Collected (UTC)": sanitizeSpreadsheetCell(r.collection_timestamp),
    "Last Verified (UTC)": sanitizeSpreadsheetCell(r.last_verified_at),
    "Saved Date (PKT)": sanitizeSpreadsheetCell(r.saved_date),
    "Saved Time (PKT)": sanitizeSpreadsheetCell(r.saved_time),
    "Exported At": sanitizeSpreadsheetCell(`${nowPkt.date} ${nowPkt.time}`),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    sheetRows.length > 0
      ? sheetRows
      : [{ Notice: "No leads matched export criteria." }]
  );

  ws["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 30 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 24 },
    { wch: 32 },
    { wch: 32 },
    { wch: 32 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "USMAN_AI_Leads");

  const metaSheet = XLSX.utils.json_to_sheet([
    {
      Platform: "USMAN AI GTM",
      "Export Target": sanitizeSpreadsheetCell(meta.export_target || "Workspace Leads"),
      "Search Keyword": sanitizeSpreadsheetCell(meta.keyword || "N/A"),
      "Country Filter": sanitizeSpreadsheetCell(meta.country || "All"),
      "Record Count": rows.length,
      "Export Timestamp": `${nowPkt.date} ${nowPkt.time}`,
      Note: "Email validation reflects syntax/domain MX checks unless marked Provider Verified; mailbox delivery is not pre-verified.",
    },
  ]);
  XLSX.utils.book_append_sheet(wb, metaSheet, "Metadata");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function buildCsvBuffer(rows: NormalizedExportLead[]): Buffer {
  const nowPkt = formatExportPkt();
  const headers = [
    "Business Name",
    "Website",
    "Domain",
    "Email",
    "Email Status",
    "Phone",
    "Phone Status",
    "Country",
    "City",
    "Address",
    "Industry",
    "Source Platform",
    "Original Source URL",
    "Email Source URL",
    "Phone Source URL",
    "Search Keyword",
    "Collected (UTC)",
    "Last Verified (UTC)",
    "Saved Date (PKT)",
    "Saved Time (PKT)",
    "Exported At",
  ];

  const lines: string[] = [headers.map((h) => escapeCsvCell(h)).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.business_name,
        r.website,
        r.domain,
        r.email,
        r.email_status,
        r.phone,
        r.phone_status,
        r.country,
        r.city,
        r.address,
        r.industry,
        r.source_platform,
        r.original_source_url,
        r.email_source_url,
        r.phone_source_url,
        r.search_keyword,
        r.collection_timestamp,
        r.last_verified_at,
        r.saved_date,
        r.saved_time,
        `${nowPkt.date} ${nowPkt.time}`,
      ]
        .map((c) => escapeCsvCell(c))
        .join(",")
    );
  }

  // UTF-8 BOM preserves Unicode characters cleanly in Excel and Windows tools
  return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8");
}

export function buildJsonBuffer(
  rows: NormalizedExportLead[],
  meta: ExportMeta = {},
  workspaceId: number = 1
): Buffer {
  const payload = {
    platform: "USMAN AI GTM",
    format: "json",
    workspace_id: workspaceId,
    exported_at: new Date().toISOString(),
    record_count: rows.length,
    meta,
    verification_disclaimer:
      "Email status indicates syntax or domain MX validation unless explicitly marked Provider Verified. Mailbox delivery cannot be verified prior to dispatch.",
    leads: rows,
  };
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

export function buildPdfBuffer(rows: NormalizedExportLead[], meta: ExportMeta = {}): Buffer {
  const nowPkt = formatExportPkt();
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFillColor(12, 16, 23);
  doc.rect(0, 0, 297, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("USMAN AI GTM — Executive Lead Intelligence Report", 12, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 195, 220);
  const subtitle = `Target: ${meta.export_target || meta.keyword || "Workspace Leads"}  |  Records: ${rows.length}  |  Generated: ${nowPkt.date} ${nowPkt.time}`;
  doc.text(subtitle.slice(0, 140), 12, 18);

  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 115);
  doc.text(
    "Verification Note: Email statuses distinguish Syntax Valid, Domain Valid (MX), Risky, and Invalid. Mailbox delivery is verified upon outreach.",
    12,
    29
  );

  const tableRows = rows.map((r, i) => [
    String(i + 1),
    r.business_name.slice(0, 36),
    r.domain || r.website.slice(0, 30) || "—",
    r.email ? `${r.email}\n[${r.email_status}]` : "Not Found",
    r.phone ? `${r.phone}\n[${r.phone_status}]` : "Not Found",
    [r.city, r.country].filter(Boolean).join(", ").slice(0, 28) || "—",
    r.source_platform.slice(0, 22),
    r.saved_date,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [["#", "Business Name", "Domain / Web", "Email & Status", "Phone & Status", "Location", "Source", "Date"]],
    body: tableRows.length > 0 ? tableRows : [["—", "No records matched export criteria.", "", "", "", "", "", ""]],
    styles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      overflow: "linebreak",
      textColor: [25, 32, 44],
    },
    headStyles: {
      fillColor: [24, 52, 102],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 42 },
      2: { cellWidth: 35 },
      3: { cellWidth: 50 },
      4: { cellWidth: 37 },
      5: { cellWidth: 35 },
      6: { cellWidth: 33 },
      7: { cellWidth: 24 },
    },
    margin: { left: 10, right: 10 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `USMAN AI GTM • Confidential Workspace Export • Page ${p} of ${pageCount}`,
      12,
      204
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
