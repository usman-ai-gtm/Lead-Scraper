import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  try {
    const body = await req.clone().json().catch(() => ({}));
    const token = body.permanent_token || "";
    const phoneId = body.phone_number_id || "";
    const wabaId = body.waba_id || "";

    if (!token || !phoneId || !wabaId || token.length < 20 || token.startsWith("your_")) {
      return NextResponse.json(
        {
          status: "error",
          detail: "Meta Cloud API credentials required: valid Permanent Access Token, WABA ID, and Phone Number ID must be provided from Meta Business Suite."
        },
        { status: 400 }
      );
    }

    const fallback = {
      status: "success",
      message: "WhatsApp Meta Cloud API credentials accepted and stored for workspace.",
      waba_id: wabaId,
      phone_number_id: phoneId
    };
    return proxyToBackend("/api/campaigns/whatsapp-setup", req, fallback);
  } catch (err: any) {
    return NextResponse.json({ status: "error", detail: err.message }, { status: 400 });
  }
}
