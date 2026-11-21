import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

async function ensureProfileTable() {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS workspace_profiles (
        workspace_id integer PRIMARY KEY,
        business_name text,
        website text,
        country text,
        city text,
        industry text,
        products_services text,
        target_customer_type text,
        ideal_industries text,
        target_business_size text,
        preferred_locations text,
        keywords text,
        exclusions text,
        additional_instructions text,
        ai_summary text,
        created_at text,
        updated_at text
      )
    `);
  } catch (e) {
    console.error("Error creating workspace_profiles table:", e);
  }
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;

    if (!isNeonConfigured()) {
      return NextResponse.json({ profile: null });
    }

    await ensureProfileTable();
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ profile: null });

    const rows = await sql.query(
      "SELECT * FROM workspace_profiles WHERE workspace_id = $1 LIMIT 1",
      [workspaceId]
    );

    return NextResponse.json({
      status: "success",
      workspace_id: workspaceId,
      profile: rows[0] || null,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;
    const body = await req.json().catch(() => ({}));
    const nowIso = new Date().toISOString();

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }

    await ensureProfileTable();
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });

    await sql.query(
      `INSERT INTO workspace_profiles (
        workspace_id, business_name, website, country, city, industry,
        products_services, target_customer_type, ideal_industries,
        target_business_size, preferred_locations, keywords, exclusions,
        additional_instructions, ai_summary, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      ON CONFLICT (workspace_id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        website = EXCLUDED.website,
        country = EXCLUDED.country,
        city = EXCLUDED.city,
        industry = EXCLUDED.industry,
        products_services = EXCLUDED.products_services,
        target_customer_type = EXCLUDED.target_customer_type,
        ideal_industries = EXCLUDED.ideal_industries,
        target_business_size = EXCLUDED.target_business_size,
        preferred_locations = EXCLUDED.preferred_locations,
        keywords = EXCLUDED.keywords,
        exclusions = EXCLUDED.exclusions,
        additional_instructions = EXCLUDED.additional_instructions,
        ai_summary = EXCLUDED.ai_summary,
        updated_at = EXCLUDED.updated_at`,
      [
        workspaceId,
        body.business_name || "",
        body.website || "",
        body.country || "",
        body.city || "",
        body.industry || "",
        body.products_services || "",
        body.target_customer_type || "",
        body.ideal_industries || "",
        body.target_business_size || "",
        body.preferred_locations || "",
        body.keywords || "",
        body.exclusions || "",
        body.additional_instructions || "",
        body.ai_summary || "",
        nowIso,
      ]
    );

    return NextResponse.json({
      status: "success",
      message: "Business profile saved permanently to workspace database.",
      workspace_id: workspaceId,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to save profile" }, { status: 500 });
  }
}
