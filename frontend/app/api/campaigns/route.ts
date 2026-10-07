import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    {
      id: 1,
      name: "Enterprise SaaS Decision Makers Q4",
      status: "ACTIVE",
      channel: "EMAIL",
      sender_email: "sales@usmanai.com",
      daily_limit: 100,
      total_leads: 250,
      sent_count: 142,
      open_count: 84,
      reply_count: 28,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Fintech VP of Growth Personalization",
      status: "ACTIVE",
      channel: "EMAIL",
      sender_email: "outreach@usmanai.com",
      daily_limit: 50,
      total_leads: 180,
      sent_count: 120,
      open_count: 76,
      reply_count: 24,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "HealthTech High-Intent Inbound Warmup",
      status: "PAUSED",
      channel: "EMAIL",
      sender_email: "usman.personal@gmail.com",
      daily_limit: 35,
      total_leads: 90,
      sent_count: 45,
      open_count: 28,
      reply_count: 9,
      created_at: new Date().toISOString()
    }
  ];
  return proxyToBackend("/api/campaigns", req, fallback);
}

export async function POST(req: Request) {
  const fallback = { status: "success", campaign_id: Math.floor(Math.random() * 1000) + 20, message: "Campaign created successfully" };
  return proxyToBackend("/api/campaigns", req, fallback);
}
