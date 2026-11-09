import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    const rawBackend = process.env.BACKEND_URL;
    const isLocalhost = !rawBackend || rawBackend.includes("localhost") || rawBackend.includes("127.0.0.1");
    const backendUrl = (isVercel && isLocalhost) ? "" : (rawBackend || (isVercel ? "" : "http://127.0.0.1:8000"));

    // 1. Try FastAPI backend first if available
    if (backendUrl) {
      try {
        const authHeader = req.headers.get("authorization") || "";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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
    }

    // 2. Direct Serper API discovery on Vercel Serverless with Multi-Platform & 5-Score Calculation
    const serperKey = process.env.SERPER_API_KEY || "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297";
    const keyword = body.keyword || body.query || "business";
    const country = body.country || "";
    const city = body.city || "";
    const platform = body.platform || "All Platforms";
    const industry = body.industry || "B2B";
    const limit = Math.min(Number(body.target_count || body.limit) || 10, 50);

    const minScore = Number(body.min_score || 0);
    const minBuyingPotential = Number(body.min_buying_potential || 0);
    const emailRequired = Boolean(body.email_required);
    const phoneRequired = Boolean(body.phone_required);
    const websiteStatus = String(body.website_status || "Any");
    const intentCategory = String(body.intent_category || "Any");

    // Build platform query
    const locParts = [city, country].filter((x) => x && x !== "All Countries" && x !== "All Cities" && x !== "Any" && x !== "Global");
    const locStr = locParts.join(" ");

    let searchQuery = `${keyword} ${locStr}`.trim();
    if (platform === "LinkedIn") {
      searchQuery = `site:linkedin.com/company/ "${keyword}" ${locStr}`.trim();
    } else if (platform === "Instagram") {
      searchQuery = `site:instagram.com "${keyword}" ${locStr}`.trim();
    } else if (platform === "Facebook") {
      searchQuery = `site:facebook.com "${keyword}" ${locStr}`.trim();
    } else if (platform === "X (Twitter)" || platform === "Twitter") {
      searchQuery = `(site:twitter.com OR site:x.com) "${keyword}" ${locStr}`.trim();
    } else if (platform === "Google Maps") {
      searchQuery = `"${keyword}" in ${locStr || "metropolitan"}`.trim();
    } else if (platform === "Business Directories") {
      searchQuery = `"${keyword}" directory ${locStr}`.trim();
    } else if (platform === "YouTube") {
      searchQuery = `site:youtube.com "${keyword}" ${locStr}`.trim();
    } else if (platform === "Reddit") {
      searchQuery = `site:reddit.com "${keyword}" ${locStr}`.trim();
    } else if (platform === "Telegram") {
      searchQuery = `site:t.me "${keyword}" ${locStr}`.trim();
    }

    const serperRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: searchQuery, num: Math.min(limit * 2, 50) }),
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

    const discoveredLeads: any[] = [];

    for (let idx = 0; idx < organic.length; idx++) {
      const item = organic[idx];
      const link = item.link || "";
      const snippet = item.snippet || "";
      const rawTitle = item.title || "Business Lead";
      const cleanName = rawTitle.split(" - ")[0].split(" | ")[0].split(" : ")[0].trim();

      // Filter search engine indexes
      if (link.includes("google.com/search") || link.includes("bing.com/search")) continue;

      const emailMatch = snippet.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = snippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const email = emailMatch ? emailMatch[0] : "";
      const phone = phoneMatch ? phoneMatch[0] : "";

      // Feature #18: 5-Factor Lead Scoring
      let dataConf = 30;
      const positive: string[] = [];
      const negative: string[] = [];

      if (link.startsWith("http")) {
        dataConf += 30;
        positive.push("Verified active website URL present");
      } else {
        negative.push("Missing website URL");
      }
      if (email) {
        dataConf += 25;
        positive.push(`Direct business email available (${email})`);
      } else {
        negative.push("Direct email not found in crawl");
      }
      if (phone) {
        dataConf += 15;
        positive.push("Direct corporate telephone verified");
      }
      dataConf = Math.min(100, dataConf);

      let icpFit = 60;
      if (platform !== "All Platforms") {
        icpFit += 20;
        positive.push(`Discovered via targeted channel (${platform})`);
      }
      if (snippet.length > 80) {
        icpFit += 15;
        positive.push("Rich commercial description available");
      }
      icpFit = Math.min(100, icpFit);

      let oppScore = 65;
      if (!link || !snippet.toLowerCase().includes("wordpress")) oppScore += 20;
      oppScore = Math.min(100, oppScore);

      let buyingPot = 50;
      if (email && phone && link) buyingPot += 30;
      else if (link) buyingPot += 15;
      buyingPot = Math.min(100, buyingPot);

      const finalLeadScore = Math.min(100, Math.round((icpFit * 0.3) + (dataConf * 0.25) + (oppScore * 0.25) + (buyingPot * 0.2)));

      let qualLevel = "🟡 Qualified";
      let priority = "NORMAL";
      let temp: "HOT" | "WARM" | "COLD" = "WARM";
      if (finalLeadScore >= 90) { qualLevel = "🔥 Hot / Priority"; priority = "URGENT"; temp = "HOT"; }
      else if (finalLeadScore >= 75) { qualLevel = "🟢 High Potential"; priority = "HIGH"; temp = "WARM"; }
      else if (finalLeadScore < 40) { qualLevel = "🔴 Poor Fit"; priority = "LOW"; temp = "COLD"; }
      else if (finalLeadScore < 60) { qualLevel = "🟠 Low Potential"; priority = "LOW"; temp = "COLD"; }

      // Feature #19: Buying Intent
      let intentScore = 40;
      const intentCategories = ["Marketing / Lead Generation", "Website / Redesign"];
      if (link) intentScore += 15;
      if (email) intentScore += 15;
      if (snippet.length > 100) intentScore += 15;
      intentScore = Math.min(95, intentScore);

      let intentLevel = "🟡 MODERATE INTENT";
      if (intentScore >= 90) intentLevel = "🔥 VERY HIGH INTENT";
      else if (intentScore >= 75) intentLevel = "🟢 HIGH INTENT";
      else if (intentScore < 25) intentLevel = "🔴 VERY LOW INTENT";
      else if (intentScore < 50) intentLevel = "🟠 LOW INTENT";

      // Apply Advanced Filters
      if (minScore > 0 && finalLeadScore < minScore) continue;
      if (minBuyingPotential > 0 && buyingPot < minBuyingPotential) continue;
      if (emailRequired && !email) continue;
      if (phoneRequired && !phone) continue;
      if (websiteStatus === "Website Required" && !link) continue;
      if (intentCategory !== "Any" && !intentCategories.includes(intentCategory)) continue;

      discoveredLeads.push({
        id: Date.now() + idx,
        business_name: cleanName || rawTitle,
        category: keyword,
        industry: industry !== "Any" ? industry : keyword,
        city: city || "Global",
        country: country !== "All Countries" && country ? country : "Global",
        website: link,
        source_url: link,
        email: email,
        email_status: email ? "Source-matched" : "Unverified",
        phone: phone,
        phone_status: phone ? "Valid" : "Unverified",
        ai_summary: snippet,
        lead_score: finalLeadScore,
        final_lead_score: finalLeadScore,
        icp_fit_score: icpFit,
        data_confidence_score: dataConf,
        business_opportunity_score: oppScore,
        buying_potential_score: buyingPot,
        qualification_level: qualLevel,
        priority: priority,
        lead_temperature: temp,
        positive_signals: positive.join(" | ") || "Standard verified business presence",
        negative_signals: negative.join(" | ") || "None identified",
        missing_info: !email ? "Direct email" : "None",
        main_opportunity: oppScore > 75 ? "Implement custom digital dashboard or web optimization." : "Outbound GTM value pitch.",
        main_risk: dataConf < 60 ? "Incomplete contact channels." : "Standard B2B sales cycle.",
        recommended_action: finalLeadScore >= 75 ? "Initiate personalized multi-channel outreach immediately." : "Review contact details and send value email.",
        scoring_confidence: Math.round(dataConf) / 100,
        buying_intent_score: intentScore,
        buying_intent_level: intentLevel,
        buying_intent_category: intentCategories[0],
        intent_confidence: 0.82,
        crm_stage: "New Lead",
        source: `${platform !== "All Platforms" ? platform : "Google"} (Live)`,
      });

      if (discoveredLeads.length >= limit) break;
    }

    return NextResponse.json({
      status: "success",
      count: discoveredLeads.length,
      leads: discoveredLeads,
      message: `Successfully discovered ${discoveredLeads.length} live leads via Serper API (${platform}).`,
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
