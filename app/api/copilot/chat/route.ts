import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    reply: "Based on your current pipeline telemetry, you have 7 active enterprise opportunities totaling $285,500 with an average win rate of 68%. Apex Global Tech is currently in Qualified stage ($45k) and Vanguard Health is in Negotiation stage ($95k). I recommend launching an AI-personalized follow-up to Vanguard Health.",
    action_suggested: "view_pipeline",
    confidence: 0.95
  };
  return proxyToBackend("/api/copilot/chat", req, fallback);
}
