import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    settings: {
      my_business_name: "USMAN AI GTM",
      my_offering: "Autonomous AI B2B Lead Intelligence",
      value_proposition: "automate qualified lead acquisition and shorten sales cycles",
      sender_name: "Muhammad Usman",
      default_country_code: "92",
      default_tone: "Professional & Direct",
      auto_open_web: 1
    }
  };
  return proxyToBackend("/api/whatsapp/settings", req, fallback);
}

export async function POST(req: Request) {
  const fallback = {
    status: "success",
    message: "Settings updated successfully"
  };
  return proxyToBackend("/api/whatsapp/settings", req, fallback);
}
