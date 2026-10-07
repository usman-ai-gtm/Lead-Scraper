import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = [
    { title: "Apex Global Technologies", type: "company", subtitle: "Cloud Infrastructure • San Francisco, CA", link: "/app/leads?id=1" },
    { title: "Dr. David Miller", type: "contact", subtitle: "Head of Digital Operations • Vanguard Health", link: "/app/crm" },
    { title: "Predictive Deal Win-Probability Model", type: "feature", subtitle: "Feature #501 • Revenue Intelligence", link: "/app/features?id=501" },
    { title: "Enterprise SaaS Outreach Q4", type: "campaign", subtitle: "Outbound Campaign • 142 Sent", link: "/app/outreach/campaigns" }
  ];
  return proxyToBackend("/api/copilot/search", req, fallback);
}
