import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { disconnectNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const success = await disconnectNeonGmailAccount(workspaceId);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Could not disconnect Gmail account or database error." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Gmail account successfully disconnected from USMAN AI GTM.",
  });
}
