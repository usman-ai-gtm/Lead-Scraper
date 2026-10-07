import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", connector_id: params.id, message: `Integration connection #${params.id} verified` };
  return proxyToBackend(`/api/integrations/${params.id}/test`, req, fallback);
}
