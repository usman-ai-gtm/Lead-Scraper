import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    company_name: "Apex Global Technologies",
    domain: "apexglobal.io",
    summary: "Leading enterprise cloud infrastructure and security provider.",
    tech_stack: ["Kubernetes", "AWS", "Next.js", "PostgreSQL", "Snowflake"],
    decision_makers: [
      { name: "Johnathan Vance", title: "VP of Infrastructure", confidence: 0.94 },
      { name: "Sarah Lin", title: "Chief Information Security Officer", confidence: 0.89 }
    ],
    recent_signals: [
      "Secured $35M Series B funding",
      "Hiring 14 DevOps and Platform Engineers",
      "Announced expansion into EU data center region"
    ]
  };
  return proxyToBackend("/api/research", req, fallback);
}
