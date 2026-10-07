import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { id: 1, name: "Apex Global Tech", domain: "apexglobal.io", industry: "Cloud Infrastructure", employees: 250, location: "San Francisco, CA" },
    { id: 2, name: "Nexus Logistics Co", domain: "nexuslogistics.com", industry: "Supply Chain", employees: 480, location: "Austin, TX" },
    { id: 3, name: "Vanguard Health Systems", domain: "vanguardhealth.org", industry: "Healthtech", employees: 1200, location: "Boston, MA" },
    { id: 4, name: "BlueStone Financial", domain: "bluestonecap.com", industry: "Fintech", employees: 90, location: "New York, NY" }
  ];
  return proxyToBackend("/api/crm/companies", req, fallback);
}
