import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    total: 0,
    page: 1,
    page_size: 50,
    leads: []
  };
  return proxyToBackend("/api/whatsapp/leads", req, fallback);
}
