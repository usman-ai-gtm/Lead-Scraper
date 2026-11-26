import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { getPaymentSubmissionProof } from "@/lib/payments-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface RouteParams {
  params: { id: string };
}

function decodeBytea(raw: any): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") {
    if (raw.startsWith("\\x") || raw.startsWith("\\X")) {
      return Buffer.from(raw.slice(2), "hex");
    }
    return Buffer.from(raw, "base64");
  }
  return Buffer.alloc(0);
}

export async function GET(req: Request, { params }: RouteParams) {
  noStore();
  try {
    const currentUser = getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
    }
    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
    }

    const subId = parseInt(params.id, 10);
    if (Number.isNaN(subId) || subId <= 0) {
      return NextResponse.json({ detail: "Invalid submission ID." }, { status: 400 });
    }

    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB error." }, { status: 503 });

    const userId = Number(currentUser.id || currentUser.sub) || 0;
    const isOwner = isAuthorizedOwner(currentUser);
    let authWsId = Number(currentUser.workspace_id) || 0;

    if (!isOwner) {
      const uRows = await sql.query(
        `SELECT id, workspace_id, COALESCE(session_version, 1) AS session_version
         FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      if (!uRows || uRows.length === 0) {
        return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });
      }
      const tokenSv = currentUser.sv != null ? Number(currentUser.sv) : 1;
      if (tokenSv !== Number(uRows[0].session_version || 1)) {
        return NextResponse.json({ detail: "Session invalidated." }, { status: 401 });
      }
      authWsId = Number(uRows[0].workspace_id) || 0;
    }

    const proof = await getPaymentSubmissionProof(subId);
    if (!proof) {
      return NextResponse.json({ detail: "Payment proof not found." }, { status: 404 });
    }

    // Strict RBAC isolation: only Master Owner or the exact owning user & workspace
    if (!isOwner && (Number(proof.user_id) !== userId || Number(proof.workspace_id) !== authWsId)) {
      return NextResponse.json(
        { detail: "Forbidden: You cannot access another customer's payment proof." },
        { status: 403 }
      );
    }

    const bytes = decodeBytea(proof.screenshot_data);
    if (!bytes || bytes.length === 0) {
      return NextResponse.json({ detail: "Payment proof binary unavailable." }, { status: 404 });
    }

    const safeName = String(proof.screenshot_filename || `proof_${subId}`).replace(/[^a-zA-Z0-9._-]/g, "_");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": String(proof.screenshot_mime || "application/octet-stream"),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[Payment Proof GET] Error:", err);
    return NextResponse.json({ detail: err?.message || "Failed to load payment proof." }, { status: 500 });
  }
}
