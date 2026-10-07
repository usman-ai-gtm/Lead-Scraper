import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { id: 1, full_name: "Johnathan Vance", email: "j.vance@apexglobal.io", title: "VP of Enterprise Infrastructure", company_name: "Apex Global Tech" },
    { id: 2, full_name: "Sarah Chen", email: "schen@nexuslogistics.com", title: "Chief Technology Officer", company_name: "Nexus Logistics Co" },
    { id: 3, full_name: "Dr. David Miller", email: "dmiller@vanguardhealth.org", title: "Head of Digital Operations", company_name: "Vanguard Health Systems" },
    { id: 4, full_name: "Elena Rostova", email: "elena@bluestonecap.com", title: "Managing Partner", company_name: "BlueStone Financial" }
  ];
  return proxyToBackend("/api/crm/contacts", req, fallback);
}
