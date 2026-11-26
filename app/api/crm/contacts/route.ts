import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(user, "saved_leads");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  return NextResponse.json([]);
}
