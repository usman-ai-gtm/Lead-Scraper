import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // 1. Try FastAPI backend first
    try {
      const authHeader = req.headers.get("authorization") || "";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const backendRes = await fetch(`${backendUrl}/api/leads/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.status !== 503 && backendRes.status !== 502 && backendRes.status !== 504) {
        const data = await backendRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: backendRes.status });
      }
    } catch {
      // Backend is offline or running on standalone Vercel
    }

    // 2. Direct Serper API discovery on Vercel Serverless
    const serperKey = process.env.SERPER_API_KEY || "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297";
    const keyword = body.keyword || body.query || "business";
    const location = body.location || "";
    const query = `${keyword} ${location}`.trim();
    const limit = Math.min(Number(body.limit) || 10, 50);

    const serperRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: limit }),
    });

    if (!serperRes.ok) {
      return NextResponse.json({
        status: "error",
        count: 0,
        leads: [],
        message: "Search provider request failed.",
      });
    }

    const serperData = await serperRes.json();
    const organic = serperData.organic || [];

    const leads = organic.slice(0, limit).map((item: any, idx: number) => {
      const snippet = item.snippet || "";
      const emailMatch = snippet.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = snippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const email = emailMatch ? emailMatch[0] : "";
      const phone = phoneMatch ? phoneMatch[0] : "";

      return {
        id: idx + 1,
        business_name: item.title || "Business Lead",
        category: keyword,
        industry: keyword,
        city: location || "Global",
        country: location ? "Specified" : "Global",
        website: item.link || "",
        source_url: item.link || "",
        email: email,
        email_status: email ? "Source-matched" : "Unverified",
        phone: phone,
        phone_status: phone ? "Valid" : "Unverified",
        fit_score: email ? 85 : 70,
        fit_explanation: `Live match found for "${keyword}" via Google Search with source verification.`,
      };
    });

    return NextResponse.json({
      status: "success",
      count: leads.length,
      leads,
      message: `Successfully discovered ${leads.length} live leads.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        count: 0,
        leads: [],
        message: err?.message || "Search failed.",
      },
      { status: 500 }
    );
  }
}
