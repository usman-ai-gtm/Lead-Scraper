import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { normalizePhoneNumber } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") || "").trim();
  const statusFilter = (url.searchParams.get("status_filter") || "all").toLowerCase();
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("page_size") || 50)));

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) {
    return NextResponse.json({ status: "success", total: 0, page: 1, page_size: pageSize, leads: [] });
  }

  const params: any[] = [workspaceId];
  let where = `WHERE workspace_id = $1 AND phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed'`;
  if (keyword) {
    params.push(`%${keyword}%`);
    where += ` AND (business_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR city ILIKE $${params.length})`;
  }

  const [leadRows, suppRows] = await Promise.all([
    sql.query(`SELECT * FROM leads ${where} ORDER BY id DESC LIMIT $${params.length + 1}`, [...params, pageSize]).catch(() => []),
    sql.query(`SELECT phone_number FROM whatsapp_suppressions WHERE workspace_id = $1`, [workspaceId]).catch(() => []),
  ]);

  const suppSet = new Set((suppRows || []).map((s: any) => String(s.phone_number || "").replace(/\D/g, "")));
  const formatted = (leadRows || []).map((l: any) => {
    const pv = normalizePhoneNumber(l.phone, l.country);
    const isSuppressed = Boolean(pv.normalized && suppSet.has(pv.normalized.replace(/\D/g, "")));
    return {
      id: l.id,
      business_name: l.business_name || "Business Lead",
      contact_name: l.business_name || "Contact",
      phone: l.phone,
      city: l.city || "",
      country: l.country || "",
      industry: l.industry || l.category || "Commercial",
      website: l.website || l.source_url || "",
      lead_score: l.quality_score || l.lead_score || 0,
      crm_stage: l.crm_stage || "NEW",
      whatsapp_status: l.whatsapp_status || "NOT_CHECKED",
      whatsapp_checked_at: l.whatsapp_checked_at || null,
      phone_validation: pv,
      is_suppressed: isSuppressed,
    };
  });

  const filtered = formatted.filter((l: any) => {
    if (statusFilter === "ready") return l.phone_validation?.isValid && !l.is_suppressed;
    if (statusFilter === "suppressed") return l.is_suppressed;
    return true;
  });

  return NextResponse.json({
    status: "success",
    total: filtered.length,
    page: 1,
    page_size: pageSize,
    leads: filtered,
  });
}
