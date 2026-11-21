import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
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

    // Fetch current client
    const existing = await sql`
      SELECT id, email, role, status, plan, subscription_start, subscription_expires_at, subscription_status
      FROM users
      WHERE id = ${clientId} AND role != 'ADMIN'
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or cannot modify admin account." }, { status: 404 });
    }

    const client = existing[0];
    let updated: any = null;

    switch (action) {
      case "ACTIVATE_BASIC": {
        // 30 days from now
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              plan = 'BASIC',
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NOW() + INTERVAL '30 days',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "ACTIVATE_LIFETIME": {
        // Lifetime: no expiry
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              plan = 'LIFETIME',
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NULL,
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "EXTEND_30": {
        // If current expiry is in the future, add 30 days to it. Otherwise add 30 days from now.
        const currentExp = client.subscription_expires_at ? new Date(client.subscription_expires_at) : new Date();
        const baseTime = currentExp.getTime() > Date.now() ? currentExp : new Date();
        const newExpiry = new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              plan = COALESCE(plan, 'BASIC'),
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${newExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
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
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${customExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "LOCK": {
        updated = await sql`
          UPDATE users
          SET status = 'LOCKED',
              subscription_status = 'LOCKED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "UNLOCK": {
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              subscription_status = 'ACTIVE',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "SUSPEND": {
        updated = await sql`
          UPDATE users
          SET status = 'SUSPENDED',
              subscription_status = 'SUSPENDED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      default:
        return NextResponse.json(
          { detail: "Invalid action. Supported: ACTIVATE_BASIC, ACTIVATE_LIFETIME, EXTEND_30, SET_EXPIRY, LOCK, UNLOCK, SUSPEND" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      status: "success",
      client: updated?.[0] || null,
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
