import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user);
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  return NextResponse.json(
    {
      status: "unavailable",
      error: "This experimental endpoint has been retired. Use /app/leads/[id]/research or /app/leads for live execution.",
    },
    { status: 501 }
  );
}
