import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { getOwnerPlatformSettings, updateOwnerPlatformSettings } from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  try {
    const settings = await getOwnerPlatformSettings();
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to load platform settings." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const actorEmail = String(user.email || user.username || "master_owner");
    const updated = await updateOwnerPlatformSettings(
      {
        whatsapp_number: body.whatsapp_number,
        support_email: body.support_email,
        oauth_mode: body.oauth_mode,
        oauth_audience_status: body.oauth_audience_status,
        oauth_project_id: body.oauth_project_id,
        custom_shared_client_id: body.custom_shared_client_id,
        custom_shared_client_secret: body.custom_shared_client_secret,
        clear_custom_shared_oauth: Boolean(body.clear_custom_shared_oauth),
      },
      actorEmail
    );

    await logAccountAudit({
      adminId: Number(user.id || user.sub) || 2,
      adminEmail: actorEmail,
      clientId: 0,
      workspaceId: Number(user.workspace_id) || 1,
      action: "OWNER_PLATFORM_SETTINGS_UPDATED",
      details: {
        whatsapp_configured: updated.whatsappConfigured,
        oauth_mode: updated.oauthMode,
        oauth_audience_status: updated.oauthAudienceStatus,
        oauth_project_id: updated.oauthProjectId,
        shared_secret_configured: updated.clientSecretConfigured,
      },
    }).catch(() => {});

    return NextResponse.json({ status: "success", verified: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to save settings." }, { status: 400 });
  }
}
