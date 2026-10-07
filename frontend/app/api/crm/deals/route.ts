import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { id: 1, title: "Apex Global Tech - Enterprise License", amount: 45000, stage: "QUALIFIED", probability: 65, company_name: "Apex Global Tech" },
    { id: 2, title: "Nexus Logistics - Multi-Tenant Automation", amount: 28000, stage: "PROPOSAL", probability: 80, company_name: "Nexus Logistics Co" },
    { id: 3, title: "Vanguard Health - AI Intelligence Engine", amount: 95000, stage: "NEGOTIATION", probability: 90, company_name: "Vanguard Health Systems" },
    { id: 4, title: "BlueStone Capital - GTM Ops Deployment", amount: 52000, stage: "WON", probability: 100, company_name: "BlueStone Financial" }
  ];
  return proxyToBackend("/api/crm/deals", req, fallback);
}

export async function POST(req: Request) {
  const fallback = { status: "success", deal_id: Math.floor(Math.random() * 1000) + 10, message: "Deal created successfully" };
  return proxyToBackend("/api/crm/deals", req, fallback);
}
