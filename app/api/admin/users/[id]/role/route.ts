import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = { status: "success", message: `Role updated for user #${params.id}` };
  return proxyToBackend(`/api/admin/users/${params.id}/role`, req, fallback);
}
