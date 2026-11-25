import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import {
  updateNeonClientStatus,
  permanentlyDeleteClientAccount,
  disconnectNeonGmailAccount,
  logAccountAudit,
  getNeonSql,
  isNeonConfigured,
} from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

// GET single client details
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }

    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    const clients = await sql`
      SELECT id, username, email, full_name, company, role, account_type, workspace_id, status,
             plan, plan_type, plan_label, google_maps_enabled, daily_email_limit, features_json,
             custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd,
             subscription_start, subscription_expires_at, subscription_status,
             created_at, last_login, last_activity_at, updated_at
      FROM users
      WHERE id = ${clientId}
        AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
        AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      LIMIT 1
    `;

    if (!clients || clients.length === 0) {
      return NextResponse.json({ detail: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client: clients[0] });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to fetch client" }, { status: 500 });
  }
}

// DELETE: Soft revoke (default) OR Permanent Workspace Deletion (when mode=permanent + confirm_username matches)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }

    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    const existing = await sql`
      SELECT id, username, email, full_name, role, account_type, workspace_id, status
      FROM users
      WHERE id = ${clientId}
        AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
        AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or protected Master Owner cannot be deleted." }, { status: 404 });
    }

    const client = existing[0];
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const mode = String(url.searchParams.get("mode") || body.mode || "revoke").toLowerCase();

    if (mode === "permanent") {
      const confirmUsername = String(body.confirm_username || url.searchParams.get("confirm_username") || "").trim().toLowerCase();
      const expected = String(client.username || client.email || "").trim().toLowerCase();
      if (!confirmUsername || confirmUsername !== expected) {
        return NextResponse.json(
          { detail: `Permanent delete blocked: confirm_username must match '${client.username || client.email}'.` },
          { status: 400 }
        );
      }

      const deleted = await permanentlyDeleteClientAccount(clientId, confirmUsername, {
        adminId: user.id,
        adminEmail: user.email || user.username || "master_owner",
      });
      if (!deleted?.ok) {
        return NextResponse.json(
          { detail: deleted?.error || "Permanent deletion failed." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        status: "success",
        mode: "permanent",
        client_id: clientId,
        workspace_id: client.workspace_id,
        message: `Client '${client.username || client.email}' and isolated workspace #${client.workspace_id} permanently deleted.`,
      });
    }

    // Soft delete: set status to REVOKED + disconnect OAuth tokens cleanly, preserving leads and workspace audit history
    const okRes = await updateNeonClientStatus(clientId, "REVOKED");
    if (!okRes || !okRes.ok) {
      return NextResponse.json({ detail: "Failed to revoke client account." }, { status: 500 });
    }
    if (client.workspace_id) {
      await disconnectNeonGmailAccount(Number(client.workspace_id)).catch(() => {});
    }

    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email || user.username || "master_owner",
      clientId: client.id,
      clientEmail: client.email || client.username,
      workspaceId: client.workspace_id || 1,
      action: "REVOKE_CLIENT_SEAT",
      details: {
        previous_status: client.status,
        new_status: "REVOKED",
        workspace_id: client.workspace_id,
        note: "Seat revoked safely. Active tokens cleared; leads & history preserved.",
      },
    });

    return NextResponse.json({
      status: "success",
      mode: "revoke",
      client_id: clientId,
      message: `Client ${client.username || client.email} safely revoked and locked. Workspace history preserved.`,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to delete client account." }, { status: 500 });
  }
}

// PATCH: Partial update client fields
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    const existing = await sql`
      SELECT id, username, email, full_name, status, plan, workspace_id
      FROM users
      WHERE id = ${clientId}
        AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
        AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      LIMIT 1
    `;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found." }, { status: 404 });
    }

    const client = existing[0];
    const newStatus = body.status ? String(body.status).toUpperCase() : client.status;
    const newName = body.full_name ? String(body.full_name).trim() : client.full_name;

    await sql`
      UPDATE users
      SET full_name = ${newName},
          status = ${newStatus},
          updated_at = NOW()
      WHERE id = ${clientId}
    `;

    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email || user.username || "master_owner",
      clientId,
      clientEmail: client.email,
      workspaceId: client.workspace_id || 1,
      action: "UPDATE_CLIENT_PROFILE",
      details: { updates: body },
    });

    return NextResponse.json({ status: "success", message: `Client #${clientId} updated.` });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to update client." }, { status: 500 });
  }
}
