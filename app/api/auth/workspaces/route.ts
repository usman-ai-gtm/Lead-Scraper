import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }

  let targetWsId = Number(currentUser.workspace_id) || 1;
  const userId = Number(currentUser.id || currentUser.sub) || 0;

  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql && userId > 0) {
        const uRows = await sql`
          SELECT workspace_id, COALESCE(session_version, 1) AS session_version
          FROM users WHERE id = ${userId} LIMIT 1
        `;
        if (!uRows || uRows.length === 0) {
          return NextResponse.json({ detail: "User not found" }, { status: 401 });
        }
        const tokenSv = currentUser.sv != null ? Number(currentUser.sv) : 1;
        if (tokenSv !== Number(uRows[0].session_version || 1)) {
          return NextResponse.json({ detail: "Session expired" }, { status: 401 });
        }
        if (uRows[0].workspace_id) {
          targetWsId = Number(uRows[0].workspace_id);
        }

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
            },
          ]);
        }
      }
    } catch {}
  }

  return NextResponse.json([
    {
      id: targetWsId,
      name: "Client Workspace",
      owner_id: userId || 1,
      plan: "ENTERPRISE",
      created_at: new Date().toISOString(),
    },
  ]);
}
