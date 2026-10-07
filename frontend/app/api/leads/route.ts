import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    total: 15,
    page: 1,
    page_size: 25,
    total_pages: 1,
    leads: [
      {
        id: 1,
        company_name: "Apex Global Technologies",
        contact_name: "Johnathan Vance",
        title: "VP of Enterprise Infrastructure",
        email: "j.vance@apexglobal.io",
        phone: "+1 (555) 392-1049",
        lead_score: 94,
        intent_level: "HIGH",
        status: "QUALIFIED",
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        company_name: "Nexus Supply Chain Solutions",
        contact_name: "Sarah Chen",
        title: "Chief Technology Officer",
        email: "schen@nexuslogistics.com",
        phone: "+1 (555) 847-2910",
        lead_score: 88,
        intent_level: "HIGH",
        status: "CONTACTED",
        industry: "Logistics & AI",
        location: "Austin, TX",
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        company_name: "Vanguard Health Analytics",
        contact_name: "Dr. David Miller",
        title: "Head of Digital Operations",
        email: "dmiller@vanguardhealth.org",
        phone: "+1 (555) 723-9081",
        lead_score: 91,
        intent_level: "HIGH",
        status: "MEETING",
        industry: "Healthcare SaaS",
        location: "Boston, MA",
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        company_name: "BlueStone Financial Group",
        contact_name: "Elena Rostova",
        title: "Managing Partner",
        email: "elena@bluestonecap.com",
        phone: "+1 (555) 438-6621",
        lead_score: 82,
        intent_level: "MEDIUM",
        status: "WON",
        industry: "Fintech & Capital",
        location: "New York, NY",
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        company_name: "OmniCommerce Systems",
        contact_name: "Marcus Brody",
        title: "Director of RevOps",
        email: "mbrody@omnicommerce.co",
        phone: "+1 (555) 612-4439",
        lead_score: 79,
        intent_level: "MEDIUM",
        status: "QUALIFIED",
        industry: "E-Commerce",
        location: "Chicago, IL",
        created_at: new Date().toISOString()
      }
    ]
  };
  return proxyToBackend("/api/leads", req, fallback);
}
