import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  getNeonEmailSuppressions,
  addNeonEmailSuppression,
  removeNeonEmailSuppression,
} from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json({ error: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const suppressions = await getNeonEmailSuppressions(workspaceId);
  return NextResponse.json({ status: "success", suppressions });
}

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json({ error: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const reason = String(body.reason || "UNSUBSCRIBED").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid recipient email address required." }, { status: 400 });
  }
  const entry = await addNeonEmailSuppression(workspaceId, email, reason);
  if (!entry) {
    return NextResponse.json({ error: "Could not add suppression record." }, { status: 500 });
  }
  return NextResponse.json({ status: "success", suppression: entry });
}

export async function DELETE(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json({ error: subCheck.message }, { status: subCheck.statusCode || 403 });
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (!id) {
    return NextResponse.json({ error: "Suppression id is required." }, { status: 400 });
  }
  const removed = await removeNeonEmailSuppression(workspaceId, id);
  return NextResponse.json({ status: "success", removed });
}
