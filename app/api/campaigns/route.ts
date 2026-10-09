import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  // Honest zero state: no fabricated campaigns
  const fallback: any[] = [];
  return proxyToBackend("/api/campaigns", req, fallback);
}

export async function POST(req: Request) {
  return proxyToBackend("/api/campaigns", req, null);
}
