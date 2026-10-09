import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  // Honest zero-state: never return simulated accounts
  const fallback: any[] = [];
  return proxyToBackend("/api/campaigns/accounts", req, fallback);
}

export async function POST(req: Request) {
  return proxyToBackend("/api/campaigns/accounts", req, null);
}
