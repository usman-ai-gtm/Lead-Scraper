import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    agents: [
      { id: "lead_researcher", name: "Autonomous Lead Researcher", description: "Researches public domains, news, and executive moves.", status: "active", executions_today: 124 },
      { id: "email_personalizer", name: "Hyper-Personalization Agent", description: "Crafts bespoke cold-email openers based on evidence.", status: "active", executions_today: 89 },
      { id: "reply_classifier", name: "Inbound Sentiment Classifier", description: "Classifies email replies and drafts suggested responses.", status: "active", executions_today: 34 }
    ]
  };
  return proxyToBackend("/api/agents", req, fallback);
}
