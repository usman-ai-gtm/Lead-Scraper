import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, hashPassword, isAuthorizedOwner } from "@/lib/serverless-auth";
import { resetNeonClientPassword, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "Reset@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "!";
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

    const tempPassword = generateSecureTempPassword();
    const passwordHash = hashPassword(tempPassword);

    if (isNeonConfigured()) {
      const ok = await resetNeonClientPassword(clientId, passwordHash);
      if (ok) {
        return NextResponse.json({
          status: "success",
          client_id: clientId,
          temporary_password: tempPassword,
          must_change_password: true,
          message: "Temporary password regenerated successfully. Share securely with client.",
        });
      }
    }

    return NextResponse.json(
      { detail: "Client not found or password reset failed." },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to reset client password." },
      { status: 500 }
    );
  }
}
