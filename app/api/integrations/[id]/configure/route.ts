import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", connector_id: params.id, message: `Configuration saved for #${params.id}` };
  return proxyToBackend(`/api/integrations/${params.id}/configure`, req, fallback);
}
