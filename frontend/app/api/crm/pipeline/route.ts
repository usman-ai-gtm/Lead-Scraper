import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  // Honest zero state: never return fabricated sample deals
  const fallback = {
    stages: ["New Lead", "Qualified", "Contacted", "Replied", "Meeting", "Opportunity", "Won", "Lost"],
    kanban: {
      "New Lead": [],
      "Qualified": [],
      "Contacted": [],
      "Replied": [],
      "Meeting": [],
      "Opportunity": [],
      "Won": [],
      "Lost": []
    },
    total_deals: 0,
    pipeline_value: 0.0,
    won_revenue: 0.0
  };
  return proxyToBackend("/api/crm/pipeline", req, fallback);
}
