import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = "ID,Business Name,Industry,Category,Phone,Email,Website,Lead Score,CRM Stage\n";
  const res = await proxyToBackend("/api/leads/export", req, fallback);
  return res;
}

