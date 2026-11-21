import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  verifyPassword,
  createJwtToken,
  authenticateServerlessUser,
} from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Authoritative Neon PostgreSQL Authentication
    if (isNeonConfigured()) {
      try {
        const sql = getNeonSql();
        if (sql) {
          const users = await sql`
            SELECT id, email, full_name, role, workspace_id, status, password_hash, tenant_id
            FROM users
            WHERE LOWER(email) = LOWER(${email})
            LIMIT 1
          `;

          if (users && users.length > 0) {
            const user = users[0];

            const statusUpper = (user.status || "ACTIVE").toUpperCase();
            if (statusUpper === "SUSPENDED" || statusUpper === "REVOKED") {
              return NextResponse.json(
                { detail: "Account has been suspended or revoked. Please contact administrator on WhatsApp (+923174383702)." },
                { status: 403 }
              );
            }

            const isValid = verifyPassword(password, user.password_hash);
            if (!isValid) {
              return NextResponse.json(
                { detail: "Incorrect email or password" },
                { status: 401 }
              );
            }

            // Password verified successfully!
            const token = createJwtToken({
              sub: String(user.id),
              email: user.email,
              full_name: user.full_name,
              role: user.role || "ADMIN",
              workspace_id: user.workspace_id || 1,
              tenant_id: user.tenant_id || 1,
              status: user.status || "ACTIVE",
            });

            // Fetch workspace metadata
            let wsName = `${user.full_name}'s Workspace`;
            let wsCreated = new Date().toISOString();
            try {
              const wsRows = await sql`
                SELECT id, name, created_at
                FROM workspaces
                WHERE id = ${user.workspace_id || 1}
                LIMIT 1
              `;
              if (wsRows && wsRows.length > 0) {
                wsName = wsRows[0].name || wsName;
                wsCreated = wsRows[0].created_at || wsCreated;
              }
            } catch {}

            return NextResponse.json({
              token: token,
              access_token: token,
              token_type: "bearer",
              user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role || "ADMIN",
                workspace_id: user.workspace_id || 1,
                status: user.status || "ACTIVE",
              },
              workspace: {
                id: user.workspace_id || 1,
                name: wsName,
                plan: "ENTERPRISE",
                ai_credits: 50000,
                search_credits: 25000,
                created_at: wsCreated,
              },
            });
          }
        }
      } catch (dbErr: any) {
        console.error("Neon authentication lookup error:", dbErr?.message);
      }
    }

    // 2. Resilient Serverless Auth Engine Fallback (in-memory store)
    const result = authenticateServerlessUser(email, password);
    if (!result) {
      return NextResponse.json({ detail: "Incorrect email or password" }, { status: 401 });
    }

    return NextResponse.json({
      token: result.token,
      access_token: result.token,
      token_type: "bearer",
      user: result.user,
      workspace: result.workspace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Authentication failed" },
      { status: 400 }
    );
  }
}
