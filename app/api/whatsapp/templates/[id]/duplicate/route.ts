import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const templateId = Number(params.id);
  if (!templateId || Number.isNaN(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ error: "Database connection failed" }, { status: 503 });
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  const existing = await sql.query(
    `SELECT wt.*
     FROM whatsapp_templates wt
     WHERE wt.id = $1 AND wt.account_id = $2
     LIMIT 1`,
    [templateId, workspaceId]
  ).catch(() => []);

  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const src = existing[0];
  const inserted = await sql.query(
    `INSERT INTO whatsapp_templates (account_id, template_name, category, language, status, header_text, body_text, footer_text, variable_count, sample_variables, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, template_name`,
    [
      src.account_id,
      `${src.template_name || "Template"} (Copy)`,
      src.category || "MARKETING",
      src.language || "en",
      src.status || "DRAFT",
      src.header_text || "",
      src.body_text || "",
      src.footer_text || "",
      src.variable_count || 0,
      src.sample_variables || "",
      new Date().toISOString(),
    ]
  );

  return NextResponse.json({
    status: "success",
    id: inserted[0]?.id,
    template: inserted[0],
    message: "Template duplicated successfully",
  });
}
