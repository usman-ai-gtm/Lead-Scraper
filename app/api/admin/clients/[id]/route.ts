import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { updateNeonClientStatus, logAccountAudit, getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

// GET single client details
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
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
      SELECT id, email, full_name, company, role, workspace_id, status, plan,
             subscription_start, subscription_expires_at, subscription_status,
             created_at, last_login, updated_at
      FROM users
      WHERE id = ${clientId} AND role != 'ADMIN'
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

// DELETE: Safe deactivation / soft delete (protects customer leads and workspace data)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
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
      SELECT id, email, full_name, workspace_id, status FROM users WHERE id = ${clientId} AND role != 'ADMIN' LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or cannot delete admin." }, { status: 404 });
    }

    const client = existing[0];

    // Soft delete: set status to REVOKED, do not purge workspace or leads
    const ok = await updateNeonClientStatus(clientId, "REVOKED");
    if (!ok) {
      return NextResponse.json({ detail: "Failed to revoke client account." }, { status: 500 });
    }

    // Record audit log
    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email,
      clientId: client.id,
      clientEmail: client.email,
      action: "REVOKE_CLIENT_SEAT",
      details: {
        previous_status: client.status,
        new_status: "REVOKED",
        workspace_id: client.workspace_id,
        note: "Seat revoked safely. Workspace data and leads preserved.",
      },
    });

    return NextResponse.json({
      status: "success",
      client_id: clientId,
      message: `Client ${client.email} safely revoked. Workspace data preserved, seat freed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to delete client account." }, { status: 500 });
  }
}

// PATCH: Partial update client fields
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
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
      SELECT id, email, full_name, status, plan FROM users WHERE id = ${clientId} AND role != 'ADMIN' LIMIT 1
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
      adminEmail: user.email,
      clientId,
      clientEmail: client.email,
      action: "UPDATE_CLIENT_PROFILE",
      details: { updates: body },
    });

    return NextResponse.json({ status: "success", message: `Client #${clientId} updated.` });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to update client." }, { status: 500 });
  }
}
