import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    lead_score: 92,
    intent_level: "HIGH",
    confidence: 0.94,
    signals_detected: ["Hiring RevOps", "Evaluating CRM", "Series B funding"]
  };
  return proxyToBackend("/api/leads", req, fallback);
}
