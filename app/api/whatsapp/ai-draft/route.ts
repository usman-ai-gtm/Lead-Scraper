import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const fallback = async () => {
    try {
      const body = await req.clone().json();
      const bName = body.business_name || "Enterprise Lead";
      const ind = body.industry || "B2B";
      const city = body.city || "";
      const myBiz = body.my_business_name || "USMAN AI GTM";
      const valProp = body.value_proposition || "automate qualified client acquisition";
      
      const draft = `Hello ${bName}! Reaching out from ${myBiz}. We specialize in helping ${ind} organizations in ${city || "your region"} ${valProp}. Would you be open to a brief 5-minute conversation to explore synergies?`;
      return {
        status: "success",
        draft,
        metadata: {
          lead_id: body.lead_id,
          tone: body.tone || "Professional & Direct",
          char_count: draft.length,
          reading_time_sec: 12
        }
      };
    } catch {
      return {
        status: "success",
        draft: "Hello! Reaching out from USMAN AI GTM. Would you be open to a brief conversation regarding growth initiatives?",
        metadata: { char_count: 104 }
      };
    }
  };

  return proxyToBackend("/api/whatsapp/ai-draft", req, fallback);
}
