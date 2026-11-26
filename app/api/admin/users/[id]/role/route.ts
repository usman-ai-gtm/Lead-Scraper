import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
  }
  return NextResponse.json(
    { detail: `Direct role elevation on account #${params.id} is disabled to preserve Master Owner RBAC isolation.` },
    { status: 403 }
  );
}
