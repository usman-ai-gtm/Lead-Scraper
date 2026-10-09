import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  // Never simulate successful delivery on failure: return real provider response or error
  return proxyToBackend("/api/campaigns/test-send", req, null);
}
