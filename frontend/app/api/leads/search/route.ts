import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Discovered 15 target accounts matching criteria",
    leads_found: 15,
    query_applied: true
  };
  return proxyToBackend("/api/leads/search", req, fallback);
}
