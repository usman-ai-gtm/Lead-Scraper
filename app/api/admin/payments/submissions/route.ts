import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured } from "@/lib/neon-db";
import { listAdminPaymentSubmissions } from "@/lib/payments-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }
  try {
    const submissions = await listAdminPaymentSubmissions();
    return NextResponse.json({ submissions });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to load payment submissions." }, { status: 500 });
  }
}
