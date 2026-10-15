import { proxyToBackend } from "@/lib/backend-proxy";
import { DEFAULT_COMPANION_TEMPLATES } from "@/lib/whatsapp-companion";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    templates: DEFAULT_COMPANION_TEMPLATES
  };
  return proxyToBackend("/api/whatsapp/templates", req, fallback);
}

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    id: Date.now(),
    message: "Template created successfully"
  };
  return proxyToBackend("/api/whatsapp/templates", req, fallback);
}
