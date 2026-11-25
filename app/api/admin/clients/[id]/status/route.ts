import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { updateNeonClientStatus, isNeonConfigured } from "@/lib/neon-db";

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
      const ok = await updateNeonClientStatus(clientId, newStatus);
      if (ok) {
        return NextResponse.json({
          status: "success",
          client_id: clientId,
          new_status: newStatus,
          message: `Client #${clientId} status updated to ${newStatus}.`,
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
      const ok = await updateNeonClientStatus(clientId, "REVOKED");
      if (ok) {
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
