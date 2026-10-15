import { proxyToBackend } from "@/lib/backend-proxy";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "success",
    message: "Suppression removed successfully"
  };
  return proxyToBackend(`/api/whatsapp/suppressions/${params.id}`, req, fallback);
}
