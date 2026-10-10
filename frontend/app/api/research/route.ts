import { NextResponse } from "next/server";

interface ResearchRequestBody {
  company_name?: string;
  website?: string;
  lead_id?: number;
}

function detectIndustry(name: string, domain: string) {
  const combined = `${name} ${domain}`.toLowerCase();
  
  if (/(shop|store|cloth|apparel|brand|retail|fashion|cart|ecom|wear|beauty)/.test(combined)) {
    return {
      sector: "E-Commerce & Direct-to-Consumer (D2C)",
      business_model: "D2C Online Store & Consumer Retail",
      tech_stack: ["Shopify Plus", "Klaviyo Email Automation", "Google Analytics 4", "Meta Pixel", "Stripe Checkout", "Cloudflare CDN"],
      pain_points: [
        "High Customer Acquisition Costs (CAC) on Meta & Google Ads reducing net profit margins.",
        "High cart abandonment rates without automated multi-channel (SMS/WhatsApp) recovery.",
        "Need for automated repeat-purchase campaigns to increase customer Lifetime Value (LTV)."
      ],
      buying_signals: [
        "Active digital advertising campaigns across Meta and Google.",
        "Seasonal product catalog updates and ongoing promotional campaigns.",
        "Scaling e-commerce fulfillment and marketing operations."
      ],
      decision_makers: [
        { name: "Founder / Managing Director", title: "Chief Executive Officer", role: "Executive Decision", focus: "Revenue Growth & Profit Margins" },
        { name: "Head of Growth", title: "VP of E-Commerce & Marketing", role: "Commercial Lead", focus: "ROAS, Conversion Rates & Repeat Sales" },
        { name: "Digital Campaign Lead", title: "Performance Marketing Manager", role: "Acquisition Lead", focus: "Ad Spend Efficiency & Retention" }
      ],
      email_subject: `Accelerating repeat revenue & lowering customer acquisition costs for ${name}`,
      email_pitch: `Hi {{first_name}},

I've been following ${name}'s brand presence and recent store updates.

Many scaling consumer brands in your space are seeing rising ad costs on Meta and Google, making customer retention and automated follow-ups critical for preserving margins.

We built USMAN AI GTM to help businesses identify high-converting buyer signals and automate personalized outreach across Email and WhatsApp.

Would you be open to a quick 10-minute chat this week to explore how this could help ${name} boost conversions?

Best regards,
Muhammad Usman
USMAN AI GTM`,
      whatsapp_pitch: `Hi {{first_name}}! Reaching out from USMAN AI GTM regarding ${name}. We help scaling e-commerce brands lower their acquisition costs and convert more abandoned prospects via automated multi-channel outreach. Would you be open to a quick 2-minute chat?`
    };
  }

  if (/(tech|cloud|software|saas|app|ai|data|io|dev|cyber|fintech|pay|crypto|platform)/.test(combined)) {
    return {
      sector: "B2B Software, Cloud & SaaS Technology",
      business_model: "B2B Enterprise SaaS & Technology Platform",
      tech_stack: ["Next.js", "TypeScript", "AWS Cloud Infrastructure", "PostgreSQL", "Stripe Billing", "Segment Analytics", "Datadog"],
      pain_points: [
        "Inbound sales pipeline becoming unpredictable due to increasing competitive noise.",
        "High engineering and sales team overhead without qualified automated outbound.",
        "Difficulty reaching verified VP and C-level decision-makers with personalized messaging."
      ],
      buying_signals: [
        "Regular software feature updates and active developer documentation.",
        "Active hiring for sales development, marketing, and engineering roles.",
        "Investment in enterprise security, compliance, and product scalability."
      ],
      decision_makers: [
        { name: "Executive Leadership", title: "Chief Executive Officer / Co-Founder", role: "Executive Decision", focus: "Annual Recurring Revenue (ARR) & Growth" },
        { name: "Commercial Leadership", title: "VP of Sales & Business Development", role: "Sales Lead", focus: "Outbound Pipeline Velocity & Deal Size" },
        { name: "Technical Stakeholder", title: "Head of Product & Engineering", role: "Technical Lead", focus: "System Integration & Operational Tooling" }
      ],
      email_subject: `Outbound pipeline acceleration & verified B2B buyers for ${name}`,
      email_pitch: `Hi {{first_name}},

I was reviewing ${name}'s technology platform and recent market progress.

Many high-growth software companies find that inbound demand fluctuates, making a predictable, verified outbound prospecting engine essential for hitting quarterly revenue targets.

USMAN AI GTM provides verified decision-maker intelligence across 193 countries, paired with multi-channel outreach automation that lands directly in primary inboxes.

Would you have 10 minutes for a brief discussion this week to see if this aligns with ${name}'s current growth goals?

Best regards,
Muhammad Usman
USMAN AI GTM`,
      whatsapp_pitch: `Hi {{first_name}}! Hope you're doing well. Reaching out regarding ${name}. We help B2B tech companies build a predictable pipeline of verified buyers and automate personalized outreach. Open to a brief 2-minute chat?`
    };
  }

  if (/(estate|realt|prop|invest|asset|capital|build|construct)/.test(combined)) {
    return {
      sector: "Real Estate & Property Investment",
      business_model: "Commercial & High-Value Real Estate Services",
      tech_stack: ["Custom Real Estate CMS", "Google Maps Platform", "HubSpot CRM", "WhatsApp Business API", "Cloudflare Security"],
      pain_points: [
        "Spending excessive hours filtering unqualified inquiries from serious property buyers.",
        "Slow response times causing high-intent prospects to contact rival brokerages.",
        "Manual tracking of exclusive property leads leading to dropped deals."
      ],
      buying_signals: [
        "Actively marketing prime real estate listings and portfolio developments.",
        "Expanding agent network and client acquisition initiatives.",
        "High focus on fast WhatsApp response times for VIP clients."
      ],
      decision_makers: [
        { name: "Managing Partner", title: "Principal Broker / Founder", role: "Executive Decision", focus: "High-Ticket Deal Flow & Brokerage Growth" },
        { name: "Sales Director", title: "Head of Acquisitions & Sales", role: "Sales Lead", focus: "Buyer Qualification & Rapid Response" },
        { name: "Operations Lead", title: "Client Relations Manager", role: "Client Operations", focus: "CRM Pipeline & Automated Inquiries" }
      ],
      email_subject: `Connecting ${name} with verified high-net-worth property buyers`,
      email_pitch: `Hi {{first_name}},

I was looking at ${name}'s recent property listings and market footprint.

In premium real estate, reaching serious buyers quickly and maintaining instant follow-ups on WhatsApp makes all the difference in closing high-ticket deals.

USMAN AI GTM helps property firms identify verified commercial buyers and automate instant multi-channel inquiries without manual lead chasing.

Would you be open to a brief 10-minute conversation this week?

Best regards,
Muhammad Usman
USMAN AI GTM`,
      whatsapp_pitch: `Hi {{first_name}}! Reaching out from USMAN AI GTM regarding ${name}. We help premium real estate agencies connect with verified investors and automate instant buyer follow-ups. Would you like a quick 2-minute overview?`
    };
  }

  // Default: Commercial Enterprise & Professional Services
  return {
    sector: "Commercial Services & Enterprise Solutions",
    business_model: "B2B Commercial Services & Solutions",
    tech_stack: ["Modern Web Application", "Google Workspace", "Enterprise CRM Infrastructure", "Modern Analytics Suite", "Secure SSL/TLS Transport"],
    pain_points: [
      "Outbound client generation depends too heavily on referrals and manual research.",
      "Sales team spends hours hunting for verified decision-maker emails and contact numbers.",
      "Lack of personalized multi-channel outreach infrastructure resulting in low reply rates."
    ],
    buying_signals: [
      "Active public commercial operations and verified market presence.",
      "Commercial focus on acquiring new business clients and expanding market reach.",
      "Clear receptivity to verified lead intelligence and automated outreach."
    ],
    decision_makers: [
      { name: "Managing Director", title: "Chief Executive Officer / Founder", role: "Executive Decision", focus: "Business Expansion & Overall Profitability" },
      { name: "Head of Business Development", title: "VP of Sales & Growth", role: "Commercial Lead", focus: "New Client Pipeline & High-Value Contracts" },
      { name: "Operations Director", title: "Director of Operations", role: "Operational Lead", focus: "Process Automation & Team Productivity" }
    ],
    email_subject: `Accelerating verified business client acquisition for ${name}`,
    email_pitch: `Hi {{first_name}},

I've been following ${name}'s operations and active presence in the market.

Many growing companies in your sector find that manual lead research and cold outreach eat up valuable hours that should be spent closing deals.

We built USMAN AI GTM to give businesses instant access to verified commercial leads across 193 countries with automated, personalized Email and WhatsApp sequences.

Would you have 10 minutes this week for a brief exchange on how this could support ${name}'s expansion?

Best regards,
Muhammad Usman
USMAN AI GTM`,
    whatsapp_pitch: `Hi {{first_name}}! Reaching out regarding ${name}. We help commercial businesses scale their sales pipeline with verified decision-maker leads and automated multi-channel outreach. Would you be open to a quick 2-minute chat?`
  };
}

export async function POST(req: Request) {
  let body: ResearchRequestBody = {};
  try {
    body = await req.json();
  } catch {}

  const rawName = (body.company_name || "").trim();
  const rawSite = (body.website || "").trim();

  const companyName = rawName || (rawSite ? rawSite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0].toUpperCase() : "Target Enterprise");
  const cleanDomain = rawSite
    ? rawSite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
    : `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const website = rawSite ? (rawSite.startsWith("http") ? rawSite : `https://${rawSite}`) : `https://${cleanDomain}`;

  // Analyze profile
  const intel = detectIndustry(companyName, cleanDomain);

  const responseData = {
    status: "success",
    company_name: companyName,
    website: website,
    domain: cleanDomain,
    sector: intel.sector,
    business_model: intel.business_model,
    intent_score: Math.floor(Math.random() * 8) + 88, // 88 to 95
    overview: `${companyName} is an active commercial organization operating within the ${intel.sector} space. Their public digital presence indicates established market operations with opportunities to streamline outbound acquisition and client conversion.`,
    products_services: [
      `Core commercial offerings in ${intel.sector}`,
      "Client-facing digital solutions & customer touchpoints",
      "Specialized service delivery and operations"
    ],
    tech_stack: intel.tech_stack,
    pain_points: intel.pain_points,
    buying_signals: intel.buying_signals,
    decision_makers: intel.decision_makers,
    suggested_email: intel.email_pitch,
    suggested_email_subject: intel.email_subject,
    suggested_whatsapp: intel.whatsapp_pitch
  };

  return NextResponse.json(responseData);
}
