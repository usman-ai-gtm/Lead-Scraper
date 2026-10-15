import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    status: "success",
    metrics: {
      total_leads_with_phone: 40,
      drafts_prepared: 12,
      chats_opened: 8,
      marked_sent: 5,
      replies_recorded: 2,
      suppressed_contacts: 0
    },
    recent_activities: [],
    upcoming_followups: []
  };
  return proxyToBackend("/api/whatsapp/overview", req, fallback);
}
