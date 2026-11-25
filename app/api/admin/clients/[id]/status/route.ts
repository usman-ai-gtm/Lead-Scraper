import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { updateNeonClientStatus, isNeonConfigured, logAccountAudit, getNeonSql } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = String(body.status || "ACTIVE").toUpperCase();

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      const targetRows = sql
        ? await sql.query(
            "SELECT id, username, email, role, account_type, workspace_id, status FROM users WHERE id = $1 LIMIT 1",
            [clientId]
          )
        : [];
      const target = targetRows?.[0];
      if (
        !target ||
        ["ADMIN", "SUPER_ADMIN"].includes(String(target.role || "").toUpperCase()) ||
        String(target.account_type || "").toUpperCase() === "MASTER_OWNER" ||
        String(target.username || "").toLowerCase() === "master_owner_usman"
      ) {
        return NextResponse.json(
          { detail: "Client not found or protected Master Owner account cannot be modified." },
          { status: 404 }
        );
      }

      const result = await updateNeonClientStatus(clientId, newStatus);
      if (result && result.ok) {
        await logAccountAudit({
          adminId: user.id,
          adminEmail: user.email || user.username || "master_owner",
          clientId,
          clientEmail: target.email || target.username,
          workspaceId: target.workspace_id || 1,
          action: `STATUS_${result.effectiveStatus}`,
          details: {
            previous_status: target.status,
            requested_status: newStatus,
            effective_status: result.effectiveStatus,
            restored_access: result.restoredAccess,
          },
        });
        return NextResponse.json({
          status: "success",
          client_id: clientId,
          new_status: result.effectiveStatus,
          restored_access: result.restoredAccess,
          message:
            result.effectiveStatus === "EXPIRED" && newStatus === "ACTIVE"
              ? `Suspension cleared for #${clientId}, but the subscription expired and access remains locked until renewed.`
              : `Client #${clientId} status updated to ${result.effectiveStatus}.`,
        });
      }
    }

    return NextResponse.json(
      { detail: "Client not found or update failed." },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to update client status." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  return POST(req, { params });
}

export async function PUT(req: Request, { params }: RouteParams) {
  return POST(req, { params });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const result = await updateNeonClientStatus(clientId, "REVOKED");
      if (result && result.ok) {
        await logAccountAudit({
          adminId: user.id,
          adminEmail: user.email || user.username || "master_owner",
          clientId,
          action: "SUBSCRIPTION_REVOKE",
          details: { previous_to: "REVOKED" },
        });
        return NextResponse.json({
          status: "success",
          client_id: clientId,
          new_status: "REVOKED",
          message: `Client #${clientId} access revoked.`,
        });
      }
    }

    return NextResponse.json(
      { detail: "Client not found or revocation failed." },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to revoke client access." },
      { status: 500 }
    );
  }
}
