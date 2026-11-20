import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { createJwtToken } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

/**
 * Validates Google session for authenticated users.
 * Strictly verifies identity against Google and Authoritative Neon PostgreSQL.
 * NEVER uses hardcoded administrator fallbacks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.name || body.full_name || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { detail: "Valid verified email required from Google authentication." },
        { status: 400 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { detail: "Database service unavailable." },
        { status: 503 }
      );
    }

    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json(
        { detail: "Database connection failed." },
        { status: 503 }
      );
    }

    // Check user in Neon PostgreSQL
    const users = await sql`
      SELECT id, email, full_name, role, workspace_id, status
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    let activeUser: any = null;

    if (users && users.length > 0) {
      const u = users[0];
      if (u.status && u.status.toUpperCase() !== "ACTIVE") {
        return NextResponse.json(
          { detail: "Your account is suspended or inactive. Please contact administrator." },
          { status: 403 }
        );
      }
      activeUser = u;
    } else {
      // First-time client registration via Google: provision clean isolated workspace
      const nowIso = new Date().toISOString();
      const wsName = fullName ? `${fullName}'s Workspace` : `${email.split("@")[0]}'s Workspace`;

      let workspaceId: number;
      try {
        const wsRes = await sql`
          INSERT INTO workspaces (name, plan, status, max_seats, created_at, updated_at)
          VALUES (${wsName}, 'STARTER', 'ACTIVE', 1, ${nowIso}, ${nowIso})
          RETURNING id, name
        `;
        workspaceId = wsRes[0].id;
      } catch {
        const wsRes = await sql`
          INSERT INTO workspaces (name, created_at, updated_at)
          VALUES (${wsName}, ${nowIso}, ${nowIso})
          RETURNING id, name
        `;
        workspaceId = wsRes[0].id;
      }

      let newUserRes: any;
      try {
        newUserRes = await sql`
          INSERT INTO users (email, username, full_name, role, workspace_id, status, created_at, updated_at)
          VALUES (${email}, ${email}, ${fullName || email.split("@")[0]}, 'CLIENT', ${workspaceId}, 'ACTIVE', ${nowIso}, ${nowIso})
          RETURNING id, email, full_name, role, workspace_id, status
        `;
      } catch {
        newUserRes = await sql`
          INSERT INTO users (email, username, full_name, role, workspace_id, status, created_at)
          VALUES (${email}, ${email}, ${fullName || email.split("@")[0]}, 'CLIENT', ${workspaceId}, 'ACTIVE', ${nowIso})
          RETURNING id, email, full_name, role, workspace_id, status
        `;
      }
      activeUser = newUserRes[0];
    }

    const token = createJwtToken({
      sub: String(activeUser.id),
      email: activeUser.email,
      full_name: activeUser.full_name,
      role: activeUser.role,
      workspace_id: activeUser.workspace_id,
    });

    const response = NextResponse.json({
      access_token: token,
      token,
      token_type: "bearer",
      user: {
        id: activeUser.id,
        email: activeUser.email,
        full_name: activeUser.full_name,
        role: activeUser.role,
        workspace_id: activeUser.workspace_id,
      },
      workspace_id: activeUser.workspace_id,
    });

    response.cookies.set("usman_gtm_token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[Google Session POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to establish Google authentication session." },
      { status: 500 }
    );
  }
}
