import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  // If backend is running, proxyToBackend fetches real leads from database
  // If backend is offline or on Vercel, return honest zero state (NO fake leads)
  const emptyFallback = {
    total: 0,
    page: 1,
    page_size: 25,
    total_pages: 0,
    leads: []
  };

  return proxyToBackend("/api/leads", req, emptyFallback);
}
