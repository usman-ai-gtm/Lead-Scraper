import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { deletePaymentMethod, listPaymentMethods, upsertPaymentMethod } from "@/lib/payments-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function requireOwner(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return { error: NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 }) };
  }
  if (!isNeonConfigured()) {
    return { error: NextResponse.json({ detail: "Database unavailable." }, { status: 503 }) };
  }
  return { user };
}

export async function GET(req: Request) {
  noStore();
  const check = requireOwner(req);
  if (check.error) return check.error;
  try {
    const methods = await listPaymentMethods(true);
    return NextResponse.json({ methods });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to list payment methods." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const check = requireOwner(req);
  if (check.error) return check.error;
  try {
    const body = await req.json().catch(() => ({}));
    const saved = await upsertPaymentMethod(body);
    await logAccountAudit({
      adminId: Number(check.user!.id || check.user!.sub) || 2,
      adminEmail: check.user!.email || check.user!.username || "master_owner",
      clientId: 0,
      workspaceId: check.user!.workspace_id || 1,
      action: body.id ? "PAYMENT_METHOD_UPDATED" : "PAYMENT_METHOD_CREATED",
      details: { id: saved.id, name: saved.name, currency: saved.currency, is_active: saved.is_active },
    });
    return NextResponse.json({ status: "success", verified: true, method: saved });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to save payment method." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  const check = requireOwner(req);
  if (check.error) return check.error;
  try {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ detail: "Valid payment method ID required." }, { status: 400 });
    }
    const ok = await deletePaymentMethod(id);
    if (!ok) {
      return NextResponse.json({ detail: "Payment method not found." }, { status: 404 });
    }
    await logAccountAudit({
      adminId: Number(check.user!.id || check.user!.sub) || 2,
      adminEmail: check.user!.email || check.user!.username || "master_owner",
      clientId: 0,
      workspaceId: check.user!.workspace_id || 1,
      action: "PAYMENT_METHOD_DELETED",
      details: { method_id: id },
    });
    return NextResponse.json({ status: "success", deleted_id: id });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to delete payment method." }, { status: 500 });
  }
}
