import { proxyToBackend } from "@/lib/backend-proxy";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyToBackend(`/api/campaigns/accounts/${params.id}`, req, null);
}
