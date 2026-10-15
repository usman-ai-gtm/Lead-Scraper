import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    activities: []
  };
  return proxyToBackend("/api/whatsapp/activities", req, fallback);
}

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Activity recorded successfully"
  };
  return proxyToBackend("/api/whatsapp/activities", req, fallback);
}
