import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  const userId = Number(user.id || user.sub) || 0;
  if (!isNeonConfigured() || userId <= 0) {
    return NextResponse.json({
      username: user.username || user.email,
      full_name: user.full_name || "",
      email: user.email || "",
      username_locked: true,
    });
  }
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }
  const rows = await sql.query(
    `SELECT id, username, full_name, email, COALESCE(session_version, 1) AS session_version FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!rows || rows.length === 0) {
    return NextResponse.json({ detail: "Account not found." }, { status: 404 });
  }
  const u = rows[0];
  if (!isAuthorizedOwner(user) && (user.sv != null ? Number(user.sv) : 1) !== Number(u.session_version || 1)) {
    return NextResponse.json({ detail: "Session invalidated. Please sign in again." }, { status: 401 });
  }
  return NextResponse.json({
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    email: u.email,
    username_locked: true,
  });
}

async function handleProfileUpdate(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Absolute enforcement: customers can NEVER modify their permanent username
    if (body.username !== undefined || body.new_username !== undefined || body.login_id !== undefined) {
      return NextResponse.json(
        {
          detail: "Customer usernames are permanent and cannot be modified. Contact the Workspace Owner if exceptional administrative correction is needed.",
          code: "USERNAME_IMMUTABLE",
        },
        { status: 403 }
      );
    }

    if (body.role !== undefined || body.account_type !== undefined || body.status !== undefined || body.plan !== undefined) {
      return NextResponse.json(
        { detail: "Account role and subscription tier cannot be modified from user profile." },
        { status: 403 }
      );
    }

    const fullName = String(body.full_name || "").trim();
    if (!fullName || fullName.length < 2 || fullName.length > 80) {
      return NextResponse.json(
        { detail: "Full name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const userId = Number(user.id || user.sub) || 0;
    if (!isNeonConfigured() || userId <= 0) {
      return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
    }
    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json({ detail: "Database connection failed." }, { status: 503 });
    }

    const currentRows = await sql.query(
      `SELECT id, username, email, workspace_id, COALESCE(session_version, 1) AS session_version FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!currentRows || currentRows.length === 0) {
      return NextResponse.json({ detail: "User account not found." }, { status: 404 });
    }
    const dbUser = currentRows[0];
    if (!isAuthorizedOwner(user) && (user.sv != null ? Number(user.sv) : 1) !== Number(dbUser.session_version || 1)) {
      return NextResponse.json({ detail: "Session invalidated. Please sign in again." }, { status: 401 });
    }

    const updated = await sql.query(
      `UPDATE users SET full_name = $1, updated_at = $2 WHERE id = $3 RETURNING id, username, full_name, email`,
      [fullName, new Date().toISOString(), userId]
    );

    await logAccountAudit({
      adminId: userId,
      adminEmail: dbUser.username || dbUser.email || "user",
      clientId: userId,
      clientEmail: dbUser.email || dbUser.username || "",
      workspaceId: dbUser.workspace_id || 1,
      action: "USER_PROFILE_UPDATED",
      details: { full_name: fullName, username_unchanged: dbUser.username },
    }).catch(() => {});

    return NextResponse.json({
      status: "success",
      profile: updated[0],
      message: "Profile display name updated. Permanent username remains unchanged.",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to update profile." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  return handleProfileUpdate(req);
}

export async function PUT(req: Request) {
  return handleProfileUpdate(req);
}

export async function POST(req: Request) {
  return handleProfileUpdate(req);
}
