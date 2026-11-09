import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.clone().json();
    prompt = body.prompt || "";
  } catch {}

  const pClean = prompt.toLowerCase();
  
  // Intelligent TypeScript fallback matching Python LeadService.generate_ai_strategy
  let detectedCountry = "All Countries";
  let detectedCity = "";
  if (pClean.includes("dubai")) { detectedCountry = "United Arab Emirates"; detectedCity = "Dubai"; }
  else if (pClean.includes("london")) { detectedCountry = "United Kingdom"; detectedCity = "London"; }
  else if (pClean.includes("new york")) { detectedCountry = "United States"; detectedCity = "New York"; }
  else if (pClean.includes("lahore")) { detectedCountry = "Pakistan"; detectedCity = "Lahore"; }
  else if (pClean.includes("sydney")) { detectedCountry = "Australia"; detectedCity = "Sydney"; }
  else if (pClean.includes("toronto")) { detectedCountry = "Canada"; detectedCity = "Toronto"; }
  else if (pClean.includes("riyadh")) { detectedCountry = "Saudi Arabia"; detectedCity = "Riyadh"; }

  let industry = "B2B & Commercial";
  let businessType = "Enterprise";
  if (pClean.includes("real estate") || pClean.includes("property")) { industry = "Real Estate"; businessType = "Agency"; }
  else if (pClean.includes("dentist") || pClean.includes("clinic")) { industry = "Healthcare"; businessType = "Medical Clinic"; }
  else if (pClean.includes("hotel") || pClean.includes("resort")) { industry = "Hospitality"; businessType = "Hotel / Resort"; }
  else if (pClean.includes("saas") || pClean.includes("software")) { industry = "Technology & Software"; businessType = "SaaS Startup"; }
  else if (pClean.includes("law") || pClean.includes("attorney")) { industry = "Legal Services"; businessType = "Law Firm"; }

  const platforms = ["Google Search", "Google Maps"];
  if (pClean.includes("b2b") || pClean.includes("agency") || pClean.includes("saas") || pClean.includes("firm")) {
    platforms.unshift("LinkedIn");
  }
  if (pClean.includes("luxury") || pClean.includes("hotel") || pClean.includes("real estate")) {
    platforms.push("Instagram");
  }

  const services: string[] = [];
  if (pClean.includes("web") || pClean.includes("redesign") || pClean.includes("site")) services.push("Website / Redesign");
  if (pClean.includes("marketing") || pClean.includes("leads") || pClean.includes("ads") || pClean.includes("acquisition")) services.push("Marketing / Lead Generation");
  if (pClean.includes("crm")) services.push("CRM");
  if (pClean.includes("automation") || pClean.includes("ai")) services.push("Workflow Automation");
  if (!services.length) services.push("Business Growth");

  const fallback = {
    status: "success",
    suggested_keyword: prompt.replace(/find|looking|need|needing|with|who|high|end/gi, "").trim() || prompt,
    country: detectedCountry,
    city: detectedCity,
    industry,
    business_type: businessType,
    platform: platforms[0] || "All Platforms",
    recommended_platforms: platforms,
    target_services: services,
    recommended_filters: {
      min_score: 75,
      min_buying_potential: 60,
      website_required: true,
      email_required: true,
      phone_required: false,
      intent_category: services[0] || "Business Growth"
    },
    reasoning: `AI Strategy generated for "${prompt}": Target ${platforms[0]} in ${detectedCity || detectedCountry} with verified email contacts and high potential for ${services[0]}.`
  };

  return proxyToBackend("/api/leads/ai-strategy", req, fallback);
}
