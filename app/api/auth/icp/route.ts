import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    business_name: "USMAN AI GTM",
    offer_description: "B2B Lead Discovery, Market Intelligence, and Automated Outreach SaaS",
    target_industries: "Technology, SaaS, Healthcare, Real Estate, Professional Services",
    target_company_sizes: "10-50, 50-250, 250+",
    target_locations: "United States, United Kingdom, Canada, Pakistan, UAE",
    ideal_customer_roles: "Founder, CEO, VP Sales, Head of Growth, Marketing Director",
    typical_problems_solved: "Cold outreach scale, lead data accuracy, CRM pipeline acceleration",
    excluded_industries: "Gambling, Adult, Low-intent retail",
    additional_instructions: "Prioritize accounts with verified email and official corporate website."
  };
  return proxyToBackend("/api/auth/icp", req, fallback);
}

export async function POST(req: Request) {
  return proxyToBackend("/api/auth/icp", req, null);
}
