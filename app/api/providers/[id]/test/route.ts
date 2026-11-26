import { NextResponse } from "next/server";
import { USMAN_DEFAULT_29_PROVIDERS } from "@/lib/default-providers";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  if (!isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Administrator role required." }, { status: 403 });
  }

  const providerId = parseInt(params.id, 10);
  const found = USMAN_DEFAULT_29_PROVIDERS.find((p) => p.id === providerId);
  const pName = found?.name || `Provider #${providerId}`;
  const envKey = found?.envVar ? (process.env[found.envVar] || "").trim() : "";

  if (!envKey) {
    return NextResponse.json({
      provider_name: pName,
      status: "NOT_CONFIGURED",
      latency_ms: 0,
      message: `${pName} environment variable (${found?.envVar || "UNKNOWN"}) is not configured on the server.`,
    });
  }

  const pNameLower = pName.toLowerCase();
  const t0 = Date.now();
  let status = "CONNECTED";
  let detailMsg = "";

  try {
    if (pNameLower.includes("serper")) {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": envKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: "ping", num: 1 }),
      });
      status = res.ok ? "CONNECTED" : `HTTP_${res.status}`;
    } else if (pNameLower.includes("gemini")) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(envKey)}`
      );
      status = res.ok ? "CONNECTED" : `HTTP_${res.status}`;
    } else if (pNameLower.includes("groq")) {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${envKey}` },
      });
      status = res.ok ? "CONNECTED" : `HTTP_${res.status}`;
    } else {
      status = "CONFIGURED";
    }
  } catch (e: any) {
    status = "TIMEOUT";
    detailMsg = e?.message || "Network timeout";
  }

  return NextResponse.json({
    provider_name: pName,
    status,
    latency_ms: Date.now() - t0,
    message: `${pName} health check: ${status}${detailMsg ? ` (${detailMsg})` : ""}`,
  });
}
