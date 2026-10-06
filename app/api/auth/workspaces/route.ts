import { NextResponse } from "next/server";

export async function GET() {
  const workspaces = [
    {
      id: 1,
      name: "SALES MANAGER Workspace",
      owner_id: 1,
      plan: "ENTERPRISE",
      created_at: new Date().toISOString(),
    },
  ];

  return NextResponse.json(workspaces);
}
