import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "success",
    id: Date.now(),
    message: "Template duplicated successfully"
  };
  return proxyToBackend(`/api/whatsapp/templates/${params.id}/duplicate`, req, fallback);
}
