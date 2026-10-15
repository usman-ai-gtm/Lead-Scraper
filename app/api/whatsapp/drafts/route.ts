import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Draft saved successfully"
  };
  return proxyToBackend("/api/whatsapp/drafts", req, fallback);
}
