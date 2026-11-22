import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, logAccountAudit, computeAuthoritativeUserStatus } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to manage client subscriptions." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toUpperCase();
    const notes = body.notes ? String(body.notes) : null;

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    // Fetch current client (strict RBAC: cannot modify admin or Master Owner accounts)
    const existing = await sql`
      SELECT id, email, full_name, role, account_type, status, plan, active, is_active,
             subscription_start, subscription_expires_at, subscription_status
      FROM users
      WHERE id = ${clientId} AND role != 'ADMIN' AND role != 'SUPER_ADMIN' AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or cannot modify admin account." }, { status: 404 });
    }

    const client = existing[0];
    let updated: any = null;

    switch (action) {
      case "ACTIVATE_BASIC": {
        // Basic: $25 / 30 Days (auto-locks after 30 days)
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = 'BASIC',
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NOW() + INTERVAL '30 days',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "ACTIVATE_LIFETIME": {
        // Lifetime: $100 One-Time (permanent access, no expiry)
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = 'LIFETIME',
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NULL,
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "EXTEND_30":
      case "RENEW": {
        // If current expiry is in the future, add 30 days to it. Otherwise add 30 days from now.
        const currentExp = client.subscription_expires_at ? new Date(client.subscription_expires_at) : new Date();
        const baseTime = currentExp.getTime() > Date.now() ? currentExp : new Date();
        const newExpiry = new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = COALESCE(plan, 'BASIC'),
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${newExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "SET_EXPIRY": {
        const customExpiry = body.expires_at ? new Date(body.expires_at).toISOString() : null;
        if (!customExpiry) {
          return NextResponse.json({ detail: "Valid expires_at ISO date string is required." }, { status: 400 });
        }
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${customExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "CHANGE_SUBSCRIPTION": {
        const targetPlan = String(body.plan || "BASIC").toUpperCase();
        const isLifetimeTarget = targetPlan === "LIFETIME";
        const newExpiry = isLifetimeTarget ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = ${targetPlan},
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = ${newExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "LOCK": {
        // Lock: instant server-side revocation of active access
        updated = await sql`
          UPDATE users
          SET status = 'LOCKED',
              active = 0,
              is_active = 0,
              subscription_status = 'LOCKED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "UNLOCK":
      case "RESTORE": {
        // Unlock: restore status to ACTIVE, but DO NOT grant free 30 days if expired.
        // If the subscription is expired or has no expiry, computeAuthoritativeUserStatus
        // will keep them strictly EXPIRED / LOCKED until the Owner explicitly chooses ACTIVATE_BASIC or RENEW.
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              subscription_status = 'ACTIVE',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "SUSPEND": {
        updated = await sql`
          UPDATE users
          SET status = 'SUSPENDED',
              active = 0,
              is_active = 0,
              subscription_status = 'SUSPENDED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "REVOKE":
      case "DEACTIVATE": {
        updated = await sql`
          UPDATE users
          SET status = 'REVOKED',
              active = 0,
              is_active = 0,
              subscription_status = 'REVOKED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      default:
        return NextResponse.json(
          { detail: "Invalid action. Supported: ACTIVATE_BASIC, ACTIVATE_LIFETIME, EXTEND_30, SET_EXPIRY, LOCK, UNLOCK, SUSPEND, REVOKE" },
          { status: 400 }
        );
    }

    const updatedUser = updated?.[0];
    const authoritative = updatedUser ? computeAuthoritativeUserStatus(updatedUser) : null;

    // Log action to account_audit_logs
    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email,
      clientId: client.id,
      clientEmail: client.email,
      action: `SUBSCRIPTION_${action}`,
      details: {
        previous_status: client.status,
        previous_plan: client.plan,
        updated_to: updatedUser,
        authoritative,
        notes,
      },
    });

    return NextResponse.json({
      status: "success",
      client: updatedUser ? { ...updatedUser, ...authoritative } : null,
      message: `Client #${clientId} subscription updated via ${action}.`,
    });
  } catch (err: any) {
    console.error("[Admin Subscription Update] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to update client subscription." },
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
