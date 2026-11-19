import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const targetWsId = currentUser?.workspace_id || 1;

  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        const wsRows = await sql`
          SELECT id, name, created_at
          FROM workspaces
          WHERE id = ${targetWsId}
          LIMIT 1
        `;
        if (wsRows && wsRows.length > 0) {
          return NextResponse.json([
            {
              id: wsRows[0].id,
              name: wsRows[0].name,
              plan: "ENTERPRISE",
              created_at: wsRows[0].created_at || new Date().toISOString(),
            }
          ]);
        }
      }
    } catch {}
  }

  const workspaces = [
    {
      id: targetWsId,
      name: "Enterprise Workspace",
      owner_id: currentUser?.id || 1,
      plan: "ENTERPRISE",
      created_at: new Date().toISOString(),
    },
  ];

  return NextResponse.json(workspaces);
}
