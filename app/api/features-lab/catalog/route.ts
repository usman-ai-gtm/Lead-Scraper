import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    categories: [
      { id: "rev_ai", name: "Revenue Intelligence & Models", count: 20 },
      { id: "data_clean", name: "Autonomous Enrichment & Cleanup", count: 25 },
      { id: "cadence_ops", name: "Omnichannel Cadence Orchestrator", count: 24 }
    ],
    features: [
      { id: 501, name: "Predictive Deal Win-Probability Model", category: "rev_ai", status: "READY", description: "Calculates Bayesian deal conversion likelihood based on CRM events." },
      { id: 502, name: "Autonomous Churn Risk Sentinel", category: "rev_ai", status: "READY", description: "Monitors account engagement decay to flag potential cancellations." },
      { id: 503, name: "AI Buying Committee Influence Mapper", category: "cadence_ops", status: "READY", description: "Maps C-level decision-makers and gatekeepers from public org signals." }
    ]
  };
  return proxyToBackend("/api/features-lab/catalog", req, fallback);
}
