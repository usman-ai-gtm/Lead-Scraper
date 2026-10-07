import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", agent_id: params.id, message: `Agent #${params.id} state toggled successfully` };
  return proxyToBackend(`/api/agents/${params.id}/toggle`, req, fallback);
}
