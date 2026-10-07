import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", agent_id: params.id, execution_id: `exec_${Date.now()}`, message: `Autonomous run triggered for #${params.id}` };
  return proxyToBackend(`/api/agents/${params.id}/run`, req, fallback);
}
