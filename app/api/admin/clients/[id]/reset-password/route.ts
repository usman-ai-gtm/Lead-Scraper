import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUserFromRequest, hashPassword, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "Reset@";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(crypto.randomInt(0, chars.length));
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
      const sql = getNeonSql();
      if (!sql) {
        return NextResponse.json({ detail: "Database connection failed" }, { status: 503 });
      }
      const res = await sql.query(
        `UPDATE users
         SET password_hash = $1,
             hashed_password = $1,
             must_change_password = TRUE,
             session_version = COALESCE(session_version, 1) + 1,
             updated_at = $2
         WHERE id = $3
           AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
           AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
           AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
         RETURNING id, username, email, workspace_id, session_version`,
        [passwordHash, new Date().toISOString(), clientId]
      );
      if (res && res.length > 0) {
        const target = res[0];
        await logAccountAudit({
          adminId: user.id,
          adminEmail: user.email || user.username || "master_owner",
          clientId: target.id,
          clientEmail: target.email || target.username,
          workspaceId: target.workspace_id || 1,
          action: "ADMIN_RESET_PASSWORD",
          details: { reset_by_owner: true, must_change_password: true, session_version: target.session_version },
        });
        return NextResponse.json({
          status: "success",
          verified: true,
          client_id: clientId,
          temporary_password: tempPassword,
          must_change_password: true,
          session_version: target.session_version,
          message: "Temporary password regenerated and existing sessions invalidated. Share securely with client.",
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
