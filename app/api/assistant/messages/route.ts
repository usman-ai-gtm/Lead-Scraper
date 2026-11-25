import { NextResponse } from "next/server";
import { getNeonChatMessages } from "@/lib/neon-db";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const currentUser = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(currentUser, "ai_assistant");
    if (!subCheck.allowed) {
      return NextResponse.json({ error: subCheck.message }, { status: subCheck.statusCode || 403 });
    }
    const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

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
