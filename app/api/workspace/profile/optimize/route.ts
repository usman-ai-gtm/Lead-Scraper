import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key.startsWith("your_") || key.length < 10) {
    return null;
  }
  return key.trim();
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user, "business_profile");
    if (!subCheck.allowed) {
      return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      business_name,
      website,
      industry,
      products_services,
      target_customer_type,
      ideal_industries,
      preferred_locations,
      keywords,
      exclusions,
      additional_instructions,
    } = body;

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      // Smart Rule-based Fallback when Gemini API key is not configured
      const baseKeywords = (keywords || products_services || industry || "Commercial")
        .split(/[,;\n]/)
        .map((k: string) => k.trim())
        .filter(Boolean);

      return NextResponse.json({
        status: "success",
        optimized: {
          recommended_keywords: baseKeywords.slice(0, 8).join(", ") || `${industry || "B2B"} Services`,
          recommended_exclusions: exclusions || "Retail consumers, Personal accounts, Students, Free trial seekers",
          value_proposition: `We help ${target_customer_type || "businesses"} streamline their operations and scale revenue with our specialized ${products_services || industry || "solutions"}.`,
          ai_summary: `${business_name || "Company"} provides ${products_services || "products/services"} to ${target_customer_type || "B2B clients"} in ${preferred_locations || "target markets"}.`,
        },
        model: "RULE_BASED_FALLBACK",
      });
    }

    const prompt = `You are a B2B Go-To-Market and Lead Generation Strategist for USMAN AI GTM.
Analyze the following client business information and organize it into a structured ICP profile:

Business Name: ${business_name || "N/A"}
Website: ${website || "N/A"}
Industry: ${industry || "N/A"}
Products/Services: ${products_services || "N/A"}
Target Customer Type: ${target_customer_type || "N/A"}
Ideal Target Industries: ${ideal_industries || "N/A"}
Preferred Lead Locations: ${preferred_locations || "N/A"}
Initial Keywords: ${keywords || "N/A"}
Initial Exclusions: ${exclusions || "N/A"}
Additional Notes: ${additional_instructions || "N/A"}

Provide your response in JSON format with exactly these four string keys:
{
  "recommended_keywords": "comma-separated list of 6-10 high-converting commercial lead search keywords",
  "recommended_exclusions": "comma-separated list of 4-6 negative terms or unwanted business types to avoid",
  "value_proposition": "2-3 sentence compelling cold email value proposition tailored to target prospects",
  "ai_summary": "1-2 sentence executive summary of the business and ideal customer profile"
}
Output strictly valid JSON only. Do not invent fake claims, fake awards, or hallucinated facts.`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
    let resultJson: any = null;
    let modelUsed = "";

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
              responseMimeType: "application/json",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) {
            try {
              resultJson = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
              modelUsed = model;
              break;
            } catch {}
          }
        }
      } catch (e) {
        console.error(`Gemini model ${model} error:`, e);
      }
    }

    if (!resultJson) {
      resultJson = {
        recommended_keywords: keywords || `${industry || "B2B"} Companies, ${products_services || "Services"}`,
        recommended_exclusions: exclusions || "Students, Consumers, Retail, Free Seekers",
        value_proposition: `Helping ${target_customer_type || "enterprises"} solve critical bottlenecks with our proven ${products_services || industry || "solutions"}.`,
        ai_summary: `${business_name || "Company"} specializes in ${products_services || industry} for ${target_customer_type || "commercial clients"}.`,
      };
      modelUsed = "FALLBACK";
    }

    return NextResponse.json({
      status: "success",
      optimized: resultJson,
      model: "Intelligent Business Engine",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Optimization failed" }, { status: 500 });
  }
}
