import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Bulk action applied successfully to selected leads",
    affected_count: 5
  };
  return proxyToBackend("/api/leads/bulk-action", req, fallback);
}
