import { NextResponse } from "next/server";
import { getNeonChatMessages } from "@/lib/neon-db";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

function getAuth(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const wsHeader = req.headers.get("X-Workspace-Id");
  const workspaceId = wsHeader ? parseInt(wsHeader, 10) : (currentUser?.workspace_id || 1);
  const userId = currentUser?.id || currentUser?.user_id || 1;
  return { userId, workspaceId };
}

export async function GET(req: Request) {
  try {
    const { workspaceId } = getAuth(req);
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 });
    }

    const messages = await getNeonChatMessages(conversationId, workspaceId);
    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load messages" }, { status: 500 });
  }
}
