import { proxyToBackend } from "@/lib/backend-proxy";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", message: `Campaign #${params.id} status updated successfully` };
  return proxyToBackend(`/api/campaigns/${params.id}/status`, req, fallback);
}
