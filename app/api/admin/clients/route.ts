import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, hashPassword, isAuthorizedOwner } from "@/lib/serverless-auth";
import {
  getNeonClients,
  provisionNeonClient,
  isNeonConfigured,
} from "@/lib/neon-db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "Client@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "!";
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only administrators may view the 50-client seat roster
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to manage client seats." },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      const clients = await getNeonClients();
      const stats = {
        total_registered: clients.length,
        active: clients.filter((c: any) => c.status === "ACTIVE").length,
        locked: clients.filter((c: any) => c.status === "LOCKED").length,
        pending: clients.filter((c: any) => c.status === "PENDING").length,
        expired: clients.filter((c: any) => c.status === "EXPIRED").length,
        suspended: clients.filter((c: any) => c.status === "SUSPENDED").length,
        lifetime: clients.filter((c: any) => (c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME")).length,
        basic: clients.filter((c: any) => (c.raw_plan || c.plan || "").toUpperCase().includes("BASIC")).length,
      };
      return NextResponse.json({
        clients,
        stats,
        total_clients: clients.length,
        active_seats_used: stats.active,
        capacity: "Unlimited",
      });
    }

    return NextResponse.json({
      clients: [],
      stats: {
        total_registered: 0,
        active: 0,
        locked: 0,
        pending: 0,
        expired: 0,
        suspended: 0,
        lifetime: 0,
        basic: 0,
      },
      total_clients: 0,
      active_seats_used: 0,
      capacity: "Unlimited",
    });
  } catch (err: any) {
    console.error("[Admin Clients GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to retrieve client seats." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only administrators may provision new client seats
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to provision client seats." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || body.name || "").trim();
    const company = String(body.company || body.business_name || "").trim();
    const address = String(body.address || "").trim();
    const plan = String(body.plan || "STARTER").toUpperCase();
    const maxQuota = Number(body.max_leads_quota || 5000);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { detail: "A valid client email address is required." },
        { status: 400 }
      );
    }
    if (!fullName) {
      return NextResponse.json(
        { detail: "Client full name is required." },
        { status: 400 }
      );
    }

    const tempPassword = generateSecureTempPassword();
    const passwordHash = hashPassword(tempPassword);

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { detail: "Database connection unavailable. Cannot provision client." },
        { status: 503 }
      );
    }

    const res = await provisionNeonClient({
      email,
      fullName,
      company: company || undefined,
      address: address || undefined,
      plan,
      passwordHash,
      maxQuota,
    });

    return NextResponse.json({
      status: "success",
      client_id: res.client.id,
      email: res.client.email,
      client_name: res.client.full_name,
      full_name: res.client.full_name,
      company: company || res.workspace.name,
      workspace_id: res.client.workspace_id,
      workspace_name: res.workspace.name,
      temporary_password: tempPassword,
      must_change_password: true,
      active_seats_used: res.active_seats_used,
      seats_remaining: res.seats_remaining,
      message: "Client provisioned successfully with fresh isolated workspace.",
    });
  } catch (err: any) {
    console.error("[Admin Clients POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to provision client seat." },
      { status: 400 }
    );
  }
}
