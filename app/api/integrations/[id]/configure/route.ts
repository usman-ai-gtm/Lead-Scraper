import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  if (!isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Administrator authorization required." }, { status: 403 });
  }

  return NextResponse.json(
    {
      status: "unavailable",
      error: `Direct connector mutation for '${params.id}' is not supported here. Configure environment variables or Gmail OAuth via /app/accounts.`,
    },
    { status: 501 }
  );
}
