import { NextResponse } from "next/server";

export async function GET() {
  const user = {
    id: 1,
    email: "telegramtiktokn1@gmail.com",
    full_name: "Muhammad Usman",
    company: "Usman CPN",
    role: "OWNER",
    workspace_id: 1,
    is_active: true,
  };

  return NextResponse.json(user);
}
