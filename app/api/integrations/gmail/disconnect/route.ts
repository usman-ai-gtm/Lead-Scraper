import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { disconnectNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const wsHeader = request.headers.get("x-workspace-id") || request.headers.get("X-Workspace-Id");
  const workspaceId = currentUser ? currentUser.workspace_id : (wsHeader ? Number(wsHeader) : 1);

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
