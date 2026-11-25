import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { disconnectNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser);
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const accountId = body.account_id ? Number(body.account_id) : undefined;
  const success = await disconnectNeonGmailAccount(workspaceId, accountId);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Could not disconnect Gmail account or database error." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: accountId
      ? `Gmail account #${accountId} successfully disconnected.`
      : "Gmail account(s) successfully disconnected from USMAN AI GTM.",
  });
}
