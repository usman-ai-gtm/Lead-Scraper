import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    {
      id: 1,
      display_name: "USMAN AI Primary Sending Account",
      email: "sales@usmanai.com",
      account_type: "email",
      provider: "gmail",
      status: "CONNECTED",
      is_active: true,
      daily_limit: 100,
      sent_today: 42,
      warmup_enabled: true,
      health_score: 98,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      display_name: "Executive Outreach Gmail",
      email: "outreach@usmanai.com",
      account_type: "email",
      provider: "gmail",
      status: "CONNECTED",
      is_active: true,
      daily_limit: 50,
      sent_today: 18,
      warmup_enabled: true,
      health_score: 95,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      display_name: "Personal Authorized Sender",
      email: "usman.personal@gmail.com",
      account_type: "email",
      provider: "gmail",
      status: "CONNECTED",
      is_active: true,
      daily_limit: 35,
      sent_today: 12,
      warmup_enabled: true,
      health_score: 99,
      created_at: new Date().toISOString()
    }
  ];
  return proxyToBackend("/api/campaigns/accounts", req, fallback);
}
