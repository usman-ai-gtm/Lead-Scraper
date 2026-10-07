import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { id: 1, action: "USER_LOGIN", user: "admin@usmanai.com", ip: "127.0.0.1", timestamp: "5m ago", status: "SUCCESS" },
    { id: 2, action: "CAMPAIGN_LAUNCH", user: "admin@usmanai.com", details: "Enterprise SaaS Decision Makers Q4", timestamp: "1h ago", status: "SUCCESS" },
    { id: 3, action: "LEAD_ENRICHMENT", user: "system_cron", details: "Enriched 25 target leads", timestamp: "3h ago", status: "SUCCESS" },
    { id: 4, action: "DEAL_STAGE_CHANGE", user: "admin@usmanai.com", details: "Vanguard Health moved to Negotiation", timestamp: "5h ago", status: "SUCCESS" }
  ];
  return proxyToBackend("/api/admin/audit-logs", req, fallback);
}
