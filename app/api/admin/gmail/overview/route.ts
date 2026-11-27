import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import {
  getOwnerPlatformSettings,
  listAdminBonusRequests,
  listAdminCustomerOAuthRequests,
} from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  try {
    const [settings, bonusRequests, customerOAuthRequests] = await Promise.all([
      getOwnerPlatformSettings(),
      listAdminBonusRequests(),
      listAdminCustomerOAuthRequests(),
    ]);
    return NextResponse.json({
      settings,
      bonus_requests: bonusRequests,
      customer_oauth_requests: customerOAuthRequests,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to load Gmail governance overview." }, { status: 500 });
  }
}
