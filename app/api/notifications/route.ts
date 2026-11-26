import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { listNotificationsForUser, markNotificationsRead } from "@/lib/notifications-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 25);
  try {
    const res = await listNotificationsForUser(user, limit);
    return NextResponse.json({
      notifications: res.notifications,
      unread_count: res.unreadCount,
      unread_payment_requests_count: res.unreadPaymentRequestsCount,
    });
  } catch (err: any) {
    console.error("[Notifications GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.notification_ids) ? body.notification_ids : undefined;
    await markNotificationsRead(user, ids);
    const updated = await listNotificationsForUser(user, 25);
    return NextResponse.json({
      status: "success",
      notifications: updated.notifications,
      unread_count: updated.unreadCount,
      unread_payment_requests_count: updated.unreadPaymentRequestsCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to update notifications." },
      { status: 500 }
    );
  }
}
