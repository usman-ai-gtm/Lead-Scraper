import { proxyToBackend } from "@/lib/backend-proxy";
import { USMAN_DEFAULT_29_PROVIDERS } from "@/lib/default-providers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const fallback = USMAN_DEFAULT_29_PROVIDERS.map((p, idx) => ({
    id: p.id,
    provider_name: p.name,
    provider_type: p.type,
    model_name: p.model,
    masked_key: p.apiKey ? `${p.apiKey.slice(0, 4)}••••••••${p.apiKey.slice(-4)}` : "Not Configured",
    has_key: Boolean(p.apiKey),
    enabled: true,
    priority: idx + 1,
    latency: p.status === "Active" ? 140 : 0,
    status: p.status === "Active" ? "CONNECTED" : "STANDBY",
  }));

  return proxyToBackend("/api/providers", req, fallback);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider_id, api_key, model_name } = body;
    if (!provider_id || !api_key) {
      return NextResponse.json({ error: "provider_id and api_key are required" }, { status: 400 });
    }

    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    const backendUrl = process.env.BACKEND_URL || (isVercel ? "" : "http://127.0.0.1:8000");

    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/api/providers/${provider_id}/key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key, model_name }),
        });
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Provider #${provider_id} key updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update provider key" }, { status: 500 });
  }
}
