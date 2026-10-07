import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    stages: ["NEW", "QUALIFIED", "CONTACTED", "REPLIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
    kanban: {
      NEW: [
        { id: 101, title: "CloudPeak Systems Enterprise Retainer", amount: 35000, company_name: "CloudPeak SaaS", contact_name: "Jessica Taylor", stage: "NEW" }
      ],
      QUALIFIED: [
        { id: 102, title: "Apex Global Tech - Enterprise License", amount: 45000, company_name: "Apex Global Tech", contact_name: "Johnathan Vance", stage: "QUALIFIED" }
      ],
      CONTACTED: [
        { id: 103, title: "TechNova Labs - Custom Scraping Adapter", amount: 12000, company_name: "TechNova AI", contact_name: "Farhan Malik", stage: "CONTACTED" }
      ],
      REPLIED: [],
      MEETING: [
        { id: 104, title: "OmniCommerce Solutions - Pilot Contract", amount: 18500, company_name: "OmniCommerce Group", contact_name: "Marcus Brody", stage: "MEETING" }
      ],
      PROPOSAL: [
        { id: 105, title: "Nexus Logistics - Multi-Tenant Automation", amount: 28000, company_name: "Nexus Logistics Co", contact_name: "Sarah Chen", stage: "PROPOSAL" }
      ],
      NEGOTIATION: [
        { id: 106, title: "Vanguard Health - AI Intelligence Engine", amount: 95000, company_name: "Vanguard Health Systems", contact_name: "Dr. David Miller", stage: "NEGOTIATION" }
      ],
      WON: [
        { id: 107, title: "BlueStone Capital - GTM Ops Deployment", amount: 52000, company_name: "BlueStone Financial", contact_name: "Elena Rostova", stage: "WON" }
      ],
      LOST: []
    },
    total_deals: 7,
    pipeline_value: 285500.0,
    won_revenue: 52000.0
  };
  return proxyToBackend("/api/crm/pipeline", req, fallback);
}
