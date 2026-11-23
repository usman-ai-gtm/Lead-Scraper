import { NextResponse } from "next/server";
import { getNeonChatConversations, createNeonChatConversation, deleteNeonChatConversation } from "@/lib/neon-db";
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
    const conversations = await getNeonChatConversations(workspaceId);
    return NextResponse.json({ conversations: conversations || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, workspaceId } = getAuth(req);
    const body = await req.json().catch(() => ({}));
    const title = (body.title || "New Consultation").substring(0, 100);
    const language = body.language || "english";

    const conv = await createNeonChatConversation(
      workspaceId,
      userId || 1,
      title,
      language,
      body.business_context || {}
    );

    if (!conv) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create conversation" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { workspaceId } = getAuth(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    const ok = await deleteNeonChatConversation(id, workspaceId);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete conversation" }, { status: 500 });
  }
}
