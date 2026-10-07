import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    integrations: [
      { id: "google", name: "Google Workspace & Gmail", category: "Email & Identity", status: "CONNECTED", icon: "mail" },
      { id: "meta_whatsapp", name: "Meta WhatsApp Business Cloud API", category: "Omnichannel", status: "READY", icon: "message-square" },
      { id: "hubspot", name: "HubSpot CRM", category: "CRM Sync", status: "CONNECTED", icon: "layers" },
      { id: "salesforce", name: "Salesforce Sales Cloud", category: "CRM Sync", status: "READY", icon: "database" },
      { id: "slack", name: "Slack Notifications", category: "Alerts", status: "CONNECTED", icon: "bell" }
    ]
  };
  return proxyToBackend("/api/integrations", req, fallback);
}
