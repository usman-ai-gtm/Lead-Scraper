import { proxyToBackend } from "@/lib/backend-proxy";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", message: `Deal #${params.id} stage updated successfully` };
  return proxyToBackend(`/api/crm/deals/${params.id}/stage`, req, fallback);
}
