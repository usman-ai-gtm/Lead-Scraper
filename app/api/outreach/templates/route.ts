import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import {
  getNeonEmailTemplates,
  saveNeonEmailTemplate,
  deleteNeonEmailTemplate,
  isNeonConfigured,
} from "@/lib/neon-db";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-template-library";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;
    let customTemplates: any[] = [];

    if (isNeonConfigured()) {
      customTemplates = await getNeonEmailTemplates(workspaceId);
    }

    // Combine standard 10 default templates with workspace custom templates
    const allTemplates = [
      ...DEFAULT_EMAIL_TEMPLATES.map((t, idx) => ({
        id: `default-${idx + 1}`,
        name: t.name,
        category: t.category,
        subject: t.subject,
        body: t.body,
        is_default: true,
      })),
      ...customTemplates.map((c) => ({
        id: String(c.id),
        name: c.name,
        category: c.category || "Custom",
        subject: c.subject,
        body: c.body,
        is_default: false,
        created_at: c.created_at,
      })),
    ];

    return NextResponse.json({
      status: "success",
      templates: allTemplates,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;
    const body = await req.json().catch(() => ({}));
    const { name, subject, body: templateBody, category, id } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Template name, subject, and body are required." },
        { status: 400 }
      );
    }

    if (isNeonConfigured()) {
      const saved = await saveNeonEmailTemplate(workspaceId, {
        id: id ? Number(id) : undefined,
        name,
        subject,
        body: templateBody,
        category: category || "CUSTOM",
      });

      return NextResponse.json({
        status: "success",
        template: saved,
        message: "Template saved permanently to workspace library.",
      });
    }

    return NextResponse.json({
      status: "success",
      template: { id: `local-${Date.now()}`, name, subject, body: templateBody },
      message: "Template saved in local session.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save template" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const workspaceId = user.workspace_id || 1;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || id.startsWith("default-")) {
      return NextResponse.json(
        { error: "Cannot delete built-in default templates." },
        { status: 400 }
      );
    }

    if (isNeonConfigured()) {
      await deleteNeonEmailTemplate(workspaceId, Number(id));
    }

    return NextResponse.json({ status: "success", message: "Template deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete template" }, { status: 500 });
  }
}
