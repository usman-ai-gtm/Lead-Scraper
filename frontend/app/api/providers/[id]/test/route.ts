import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "FAILED",
    provider_id: params.id,
    latency_ms: 0,
    message: "Unable to reach backend service for provider health check"
  };
  return proxyToBackend(`/api/providers/${params.id}/test`, req, fallback);
}
