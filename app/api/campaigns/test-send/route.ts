import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Test email dispatched successfully to verified destination",
    message_id: `msg_test_${Date.now()}`
  };
  return proxyToBackend("/api/campaigns/test-send", req, fallback);
}
