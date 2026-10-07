import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    total_leads: 184,
    verified_leads: 142,
    high_intent_leads: 58,
    active_campaigns: 4,
    total_emails_sent: 540,
    open_rate: 48.6,
    reply_rate: 19.2,
    meetings_booked: 16,
    pipeline_value: 345000.0,
    won_revenue: 88500.0,
    conversion_rate: 25.6,
    health_score: 98,
    lead_growth_series: [
      { date: "Week 1", discovered: 45, qualified: 32 },
      { date: "Week 2", discovered: 82, qualified: 64 },
      { date: "Week 3", discovered: 128, qualified: 98 },
      { date: "Week 4", discovered: 184, qualified: 142 }
    ],
    pipeline_by_stage: [
      { stage: "QUALIFIED", count: 4, value: 45000 },
      { stage: "PROPOSAL", count: 3, value: 75000 },
      { stage: "NEGOTIATION", count: 2, value: 120000 },
      { stage: "WON", count: 3, value: 88500 }
    ],
    campaign_performance: [
      { name: "Enterprise SaaS Outreach", sent: 210, opens: 112, replies: 42, status: "ACTIVE" },
      { name: "Tech Founders Nurture", sent: 180, opens: 89, replies: 28, status: "ACTIVE" },
      { name: "Executive VP Decision Makers", sent: 150, opens: 72, replies: 22, status: "ACTIVE" }
    ],
    recent_activities: [
      { type: "enrichment", text: "Enriched 25 Enterprise Leads in United States", time: "12m ago" },
      { type: "email", text: "Outbound campaign delivered 42 emails with 0 bounces", time: "35m ago" },
      { type: "crm", text: "Deal 'Apex Global Tech' moved to Proposal stage ($45,000)", time: "1h ago" },
      { type: "copilot", text: "AI Copilot synthesized prospect analysis for 12 accounts", time: "2h ago" }
    ]
  };
  return proxyToBackend("/api/analytics/dashboard", req, fallback);
}
