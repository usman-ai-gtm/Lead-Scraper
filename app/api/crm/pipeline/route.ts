import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    stages: ["New Lead", "Qualified", "Contacted", "Replied", "Meeting", "Proposal", "Won", "Lost"],
    kanban: {
      "New Lead": [
        { id: 101, title: "Apex Global Tech — Enterprise Cloud", amount: 45000, stage: "New Lead", win_probability: 40, company_name: "Apex Global Tech", contact_name: "Johnathan Vance", contact_email: "j.vance@apexglobal.io", website: "https://apexglobal.io" },
        { id: 102, title: "FinEdge Systems — Multi-Seat License", amount: 24000, stage: "New Lead", win_probability: 35, company_name: "FinEdge Systems", contact_name: "Marcus Aurelius", contact_email: "marcus@finedge.io", website: "https://finedge.io" }
      ],
      "Qualified": [
        { id: 103, title: "Nexus Logistics — Outbound Automation", amount: 32000, stage: "Qualified", win_probability: 60, company_name: "Nexus Logistics Co", contact_name: "Sarah Chen", contact_email: "schen@nexuslogistics.com", website: "https://nexuslogistics.com" }
      ],
      "Contacted": [
        { id: 104, title: "Vanguard Health — GTM Intelligence", amount: 85000, stage: "Contacted", win_probability: 70, company_name: "Vanguard Health Systems", contact_name: "Dr. David Miller", contact_email: "dmiller@vanguardhealth.org", website: "https://vanguardhealth.org" }
      ],
      "Replied": [
        { id: 105, title: "BlueStone Capital — Lead Pipeline Scale", amount: 55000, stage: "Replied", win_probability: 80, company_name: "BlueStone Financial", contact_name: "Elena Rostova", contact_email: "elena@bluestonecap.com", website: "https://bluestonecap.com" }
      ],
      "Meeting": [
        { id: 106, title: "CloudFlow Architecture — Platform Migration", amount: 62000, stage: "Meeting", win_probability: 85, company_name: "CloudFlow Inc", contact_name: "Michael Brody", contact_email: "mbrody@cloudflow.tech", website: "https://cloudflow.tech" }
      ],
      "Proposal": [
        { id: 107, title: "HyperScale Retail — Global Prospecting", amount: 48000, stage: "Proposal", win_probability: 90, company_name: "HyperScale Retail", contact_name: "Claire Dupont", contact_email: "claire@hyperscale.com", website: "https://hyperscale.com" }
      ],
      "Won": [
        { id: 108, title: "Vertex Digital — Annual Enterprise Tier", amount: 96000, stage: "Won", win_probability: 100, company_name: "Vertex Digital Solutions", contact_name: "Alexander Smith", contact_email: "alex@vertexdigital.com", website: "https://vertexdigital.com" }
      ],
      "Lost": []
    },
    total_deals: 8,
    pipeline_value: 447000.0,
    won_revenue: 96000.0
  };
  return proxyToBackend("/api/crm/pipeline", req, fallback);
}
