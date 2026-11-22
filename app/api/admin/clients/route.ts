import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, hashPassword, isAuthorizedOwner } from "@/lib/serverless-auth";
import {
  getNeonClients,
  createPaidClientAccount,
  isNeonConfigured,
  logAccountAudit,
} from "@/lib/neon-db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "Paid@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "!";
}

function generateDefaultUsername(): string {
  return `client_${Date.now().toString().slice(-6)}`;
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only administrators may view the paid client roster
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to view client roster." },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      const allAccounts = await getNeonClients();
      const paidClients = allAccounts.filter((c: any) => c.account_type === "PAID_CLIENT" || c.account_type !== "FREE_PREVIEW");
      const previewClients = allAccounts.filter((c: any) => c.account_type === "FREE_PREVIEW");

      const stats = {
        total_paid: paidClients.length,
        active_basic: paidClients.filter((c: any) => (c.raw_plan || c.plan || "").toUpperCase().includes("BASIC") && c.status === "ACTIVE").length,
        active_lifetime: paidClients.filter((c: any) => (c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME") && c.status === "ACTIVE").length,
        expired: paidClients.filter((c: any) => c.status === "EXPIRED").length,
        locked: paidClients.filter((c: any) => c.status === "LOCKED" || c.status === "SUSPENDED" || c.status === "REVOKED").length,
        total_preview: previewClients.length,
        capacity: "Unlimited",
      };

      return NextResponse.json({
        clients: paidClients,
        preview_clients: previewClients,
        stats,
        total_clients: paidClients.length,
        capacity: "Unlimited",
      });
    }

    return NextResponse.json({
      clients: [],
      preview_clients: [],
      stats: {
        total_paid: 0,
        active_basic: 0,
        active_lifetime: 0,
        expired: 0,
        locked: 0,
        total_preview: 0,
        capacity: "Unlimited",
      },
      total_clients: 0,
      capacity: "Unlimited",
    });
  } catch (err: any) {
    console.error("[Admin Clients GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to retrieve clients." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only Master Owner may create paid client accounts
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Master Owner administrator role required to create paid accounts." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const customerName = String(body.customer_name || body.full_name || body.name || "").trim();
    let username = String(body.username || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!username) {
      username = generateDefaultUsername();
    }
    if (username.length < 3) {
      return NextResponse.json(
        { detail: "Username must be at least 3 characters long." },
        { status: 400 }
      );
    }

    let plainPassword = String(body.password || "").trim();
    if (!plainPassword) {
      plainPassword = generateSecurePassword();
    }

    const rawPlan = String(body.plan || "BASIC").toUpperCase();
    const plan: "BASIC" | "LIFETIME" = rawPlan === "LIFETIME" ? "LIFETIME" : "BASIC";
    const clientNotes = body.client_notes ? String(body.client_notes).trim() : undefined;

    const passwordHash = hashPassword(plainPassword);

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { detail: "Database connection unavailable. Cannot create client account." },
        { status: 503 }
      );
    }

    const res = await createPaidClientAccount({
      customerName: customerName || username,
      username,
      passwordHash,
      plan,
      clientNotes,
    });

    await logAccountAudit({
      clientId: res.client.id,
      clientEmail: res.client.email,
      action: `CREATE_PAID_CLIENT_${plan}`,
      adminId: user.id,
      adminEmail: user.email,
      workspaceId: res.client.workspace_id,
      details: {
        username,
        customer_name: res.client.full_name,
        plan,
        subscription_expires_at: res.client.subscription_expires_at,
        workspace_id: res.client.workspace_id,
      },
    });

    const isLifetime = plan === "LIFETIME";

    return NextResponse.json({
      status: "success",
      message: `Paid ${plan} account created successfully for '${username}'.`,
      client: {
        id: res.client.id,
        username: res.client.username,
        customer_name: res.client.full_name,
        full_name: res.client.full_name,
        email: res.client.email,
        role: "CLIENT",
        account_type: "PAID_CLIENT",
        status: "ACTIVE",
        plan: isLifetime ? "LIFETIME ($100)" : "BASIC ($25/30 Days)",
        raw_plan: plan,
        subscription_start: res.client.subscription_start,
        subscription_expires_at: res.client.subscription_expires_at,
        remaining_days: isLifetime ? "Permanent Access" : 30,
        workspace_id: res.client.workspace_id,
        workspace_name: res.workspace.name,
      },
      credentials: {
        customer_id: res.client.id,
        username,
        password: plainPassword,
        customer_name: res.client.full_name,
        plan: isLifetime ? "LIFETIME ($100 One-Time)" : "BASIC ($25 / 30 Days)",
        duration: isLifetime ? "Permanent Access — No Expiry" : "30 Days from Creation",
        login_url: "https://lead-scraper-mxs5.vercel.app/login",
      },
      temporary_password: plainPassword,
    });
  } catch (err: any) {
    console.error("[Admin Clients POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to create paid client account." },
      { status: 400 }
    );
  }
}
