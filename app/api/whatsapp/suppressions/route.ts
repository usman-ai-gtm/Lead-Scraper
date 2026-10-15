import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    suppressions: []
  };
  return proxyToBackend("/api/whatsapp/suppressions", req, fallback);
}

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Suppression recorded successfully"
  };
  return proxyToBackend("/api/whatsapp/suppressions", req, fallback);
}
