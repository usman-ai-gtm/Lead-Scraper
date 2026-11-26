import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_REQUEST_TYPES = ["ACCESS", "DELETION", "OPTOUT", "CORRECTION"] as const;
const ALLOWED_STATUSES = ["OPEN", "IN_REVIEW", "COMPLETED", "REJECTED"] as const;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await consumeRateLimit({
      bucket: "privacy_dsr",
      identifier: ip,
      limit: 6,
      windowSeconds: 900,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = await req.json().catch(() => ({}));
    const requestTypeRaw = String(body.request_type || "DELETION").trim().toUpperCase();
    const requestType = ALLOWED_REQUEST_TYPES.includes(requestTypeRaw as any)
      ? requestTypeRaw
      : "DELETION";
    const requesterEmail = String(body.requester_email || "").trim().toLowerCase();
    const requesterName = String(body.requester_name || "").trim().slice(0, 120);
    const targetEmail = String(body.target_email || requesterEmail).trim().toLowerCase();
    const details = String(body.details || "").trim().slice(0, 1500);

    if (!requesterEmail || !requesterEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid contact email address is required to verify your privacy request." },
        { status: 400 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }
    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json({ error: "Database connection failed." }, { status: 503 });
    }

    const caller = getCurrentUserFromRequest(req);
    const workspaceId = Number(caller?.workspace_id) || 1;
    const userId = caller?.id ? Number(caller.id) : null;

    const inserted = await sql.query(
      `INSERT INTO privacy_requests (
        workspace_id, user_id, request_type, requester_email, requester_name,
        target_email, details, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', NOW(), NOW())
      RETURNING id, request_type, requester_email, target_email, status, created_at`,
      [workspaceId, userId, requestType, requesterEmail, requesterName, targetEmail, details]
    );

    const row = inserted[0];

    await logAccountAudit({
      clientId: userId || 0,
      adminEmail: requesterEmail,
      workspaceId,
      action: `PRIVACY_DSR_${requestType}`,
      result: "OPEN",
      details: { requestId: row?.id, targetEmail, ip },
    }).catch(() => {});

    return NextResponse.json(
      {
        status: "submitted",
        ticket_id: `DSR-${row?.id || Date.now()}`,
        request: row,
        message:
          "Your privacy request has been recorded. Requests are reviewed under our GDPR/CCPA policy within 30 days.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to record privacy request." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAuthorizedOwner(user)) {
    return NextResponse.json(
      { error: "Forbidden: Master Owner / Privacy Administrator access required." },
      { status: 403 }
    );
  }

  if (!isNeonConfigured()) {
    return NextResponse.json({ requests: [] });
  }
  const sql = getNeonSql();
  if (!sql) return NextResponse.json({ requests: [] });

  const rows = await sql.query(
    `SELECT id, workspace_id, user_id, request_type, requester_email, requester_name,
            target_email, details, status, admin_notes, resolved_by, resolved_at, created_at, updated_at
     FROM privacy_requests
     ORDER BY created_at DESC
     LIMIT 100`
  );

  return NextResponse.json({ requests: rows || [], total: rows?.length || 0 });
}

export async function PATCH(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAuthorizedOwner(user)) {
    return NextResponse.json(
      { error: "Forbidden: Master Owner authorization required." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const nextStatus = String(body.status || "IN_REVIEW").trim().toUpperCase();
  const adminNotes = String(body.admin_notes || "").trim();
  const action = String(body.action || "").trim();

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Valid request id is required." }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.includes(nextStatus as any)) {
    return NextResponse.json({ error: "Invalid DSR status." }, { status: 400 });
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const existing = await sql.query(`SELECT * FROM privacy_requests WHERE id = $1 LIMIT 1`, [id]);
  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: "Privacy request not found." }, { status: 404 });
  }
  const dsr = existing[0];

  let leadsRemoved = 0;
  let suppressionsAdded = 0;

  if (action === "purge_and_suppress" && dsr.target_email) {
    const targetEmail = String(dsr.target_email).trim().toLowerCase();
    // Ensure global opt-out suppression across affected workspaces so re-extraction does not contact them
    const wsRows = await sql.query(`SELECT DISTINCT workspace_id FROM leads WHERE LOWER(normalized_email) = $1 OR LOWER(email) = $1`, [targetEmail]).catch(() => []);
    const targetWorkspaces = wsRows.length > 0 ? wsRows.map((r: any) => Number(r.workspace_id)) : [Number(dsr.workspace_id) || 1];

    for (const wsId of targetWorkspaces) {
      await sql.query(
        `INSERT INTO email_suppressions (workspace_id, email, reason, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workspace_id, LOWER(email)) DO NOTHING`,
        [wsId, targetEmail, `DSR-${id} Opt-Out/Deletion`]
      ).catch(() => {});
      suppressionsAdded += 1;
    }

    const del = await sql.query(
      `DELETE FROM leads WHERE LOWER(normalized_email) = $1 OR LOWER(email) = $1 RETURNING id`,
      [targetEmail]
    ).catch(() => []);
    leadsRemoved = del?.length || 0;
  }

  const updated = await sql.query(
    `UPDATE privacy_requests
     SET status = $1,
         admin_notes = $2,
         resolved_by = $3,
         resolved_at = CASE WHEN $1 IN ('COMPLETED', 'REJECTED') THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [nextStatus, adminNotes, String(user.email || user.username || "Owner"), id]
  );

  return NextResponse.json({
    status: "success",
    request: updated[0],
    leads_removed: leadsRemoved,
    suppressions_added: suppressionsAdded,
  });
}
