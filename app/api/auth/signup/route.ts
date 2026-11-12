import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      detail: "Public registration is disabled. USMAN AI GTM is an invitation-only client platform. Please contact your administrator to provision your client account.",
      status: "forbidden"
    },
    { status: 403 }
  );
}
