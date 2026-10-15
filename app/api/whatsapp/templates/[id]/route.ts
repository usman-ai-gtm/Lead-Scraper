import { proxyToBackend } from "@/lib/backend-proxy";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "success",
    message: `Template #${params.id} updated successfully`
  };
  return proxyToBackend(`/api/whatsapp/templates/${params.id}`, req, fallback);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "success",
    message: `Template #${params.id} deleted successfully`
  };
  return proxyToBackend(`/api/whatsapp/templates/${params.id}`, req, fallback);
}
