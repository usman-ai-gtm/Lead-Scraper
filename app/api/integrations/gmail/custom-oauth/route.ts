import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import {
  deleteWorkspaceCustomerOAuth,
  getProductionRedirectUri,
  getWorkspaceCustomerOAuthStatus,
  validateAndSaveCustomerOAuthConfig,
} from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  const workspaceId = Number(user.workspace_id) || 1;
  try {
    const config = await getWorkspaceCustomerOAuthStatus(workspaceId);
    return NextResponse.json({
      configured: Boolean(config),
      config,
      required_redirect_uri: getProductionRedirectUri(),
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to fetch custom OAuth config." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message || "Active subscription required to configure custom OAuth." },
      { status: subCheck.statusCode || 403 }
    );
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }

  const userId = Number(subCheck.userRecord?.id || user.id) || 1;
  const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
  const username = String(subCheck.userRecord?.username || user.username || user.email || "customer");
  const email = String(subCheck.userRecord?.email || user.email || "");

  try {
    const contentType = req.headers.get("content-type") || "";
    let rawJsonText = "";
    let clientId = "";
    let clientSecret = "";
    let projectId = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof (file as any).text === "function") {
        const uploaded = file as File;
        if (uploaded.size > 65536) {
          return NextResponse.json({ detail: "OAuth JSON file must be under 64KB." }, { status: 400 });
        }
        rawJsonText = await uploaded.text();
      } else {
        rawJsonText = String(form.get("raw_json") || "");
      }
      clientId = String(form.get("client_id") || "");
      clientSecret = String(form.get("client_secret") || "");
      projectId = String(form.get("project_id") || "");
    } else {
      const body = await req.json().catch(() => ({}));
      rawJsonText = String(body.raw_json || "");
      clientId = String(body.client_id || "");
      clientSecret = String(body.client_secret || "");
      projectId = String(body.project_id || "");
    }

    const saved = await validateAndSaveCustomerOAuthConfig({
      userId,
      workspaceId,
      username,
      email,
      rawJsonText,
      clientId,
      clientSecret,
      projectId,
    });

    return NextResponse.json({
      status: "success",
      verified: true,
      config: saved,
      message:
        "Custom Google OAuth credentials encrypted and stored for your workspace only. You may now click Connect Official Gmail Account.",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Invalid OAuth configuration." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  const workspaceId = Number(user.workspace_id) || 1;
  const userId = Number(user.id || user.sub) || 0;
  const actor = String(user.email || user.username || "customer");
  const removed = await deleteWorkspaceCustomerOAuth(workspaceId, userId, actor);
  return NextResponse.json({
    status: "success",
    removed,
    message: removed
      ? "Workspace custom OAuth config removed. Reverted to Shared Owner-Managed Google OAuth."
      : "No custom OAuth config existed for this workspace.",
  });
}
