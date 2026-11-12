import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { changeServerlessUserPassword, verifyJwtToken } from "@/lib/serverless-auth";

export async function POST(req: Request) {
  const fallback = async () => {
    try {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const payload = verifyJwtToken(token);
      if (!payload || !payload.email) {
        return { status: 401, data: { detail: "Invalid or expired token" } };
      }

      const body = await req.clone().json();
      const { old_password, new_password } = body;
      if (!old_password || !new_password || new_password.length < 8) {
        return { status: 400, data: { detail: "New password must be at least 8 characters long" } };
      }

      const ok = changeServerlessUserPassword(payload.email, old_password, new_password);
      if (!ok) {
        return { status: 400, data: { detail: "Current password is incorrect" } };
      }

      return { status: 200, data: { status: "success", message: "Password updated successfully" } };
    } catch {
      return { status: 400, data: { detail: "Failed to update password" } };
    }
  };

  return proxyToBackend("/api/auth/change-password", req, fallback);
}

