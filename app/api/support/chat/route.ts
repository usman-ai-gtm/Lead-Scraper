import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_KNOWLEDGE = `
You are the official AI Customer Support Assistant for USMAN AI GTM (Website: https://lead-scraper-mxs5.vercel.app/).
You represent the founder and platform. Your job is to answer user questions accurately, professionally, concisely, and warmly.

STRICT ACCURACY RULES (GENUINE PLATFORM INFORMATION ONLY):
1. WHAT IS USMAN AI GTM:
   A high-performance B2B lead generation and cold outreach SaaS built for sales teams, agencies, and entrepreneurs.
   Features include:
   - Real-time Multi-Provider B2B Lead Search Engine (Google Places + verified business web sources) with authentic public emails and phone numbers.
   - Direct Gmail Integration: Authenticated via official Google OAuth 2.0 to send cold outreach directly from personal Gmail accounts (500 free emails/day, zero cold email provider fees).
   - Gemini AI Email Assistant: Creates natural, concise B2B proposals without corporate fluff.
   - AI Lead Research Agent: Exclusive premium feature for Lifetime Plan clients that analyzes any company, identifies genuine growth bottlenecks, and drafts hyper-personalized proposals with strategic conversion explainability.

2. PRICING & SUBSCRIPTION PLANS:
   - Basic Plan: $25 / 30 Days
     Includes: Up to 5,000 verified leads, search engine access, Gmail outreach integration, standard AI email assistant, 30 days active access. Auto-locks upon expiration until renewed.
   - Lifetime Plan: $100 One-Time (Permanent Access)
     Includes: Unlimited search engine access, permanent account access with zero monthly renewals, the exclusive AI Lead Research Agent, multi-Gmail mailbox connections, priority WhatsApp support.

3. HOW TO PURCHASE / ACTIVATE ACCOUNT:
   - Customers sign in with Google on the website (https://lead-scraper-mxs5.vercel.app/login).
   - Upon initial sign-in, accounts are placed in LOCKED status for verification and subscription purchase.
   - To activate or renew, clients contact the Owner directly on WhatsApp at +923174383702 (https://wa.me/923174383702).
   - The Owner instantly verifies payment and unlocks the account ($25 for Basic 30-Day or $100 for Lifetime).

4. GMAIL OAUTH TROUBLESHOOTING:
   - If a user sees "Access blocked: App is currently being tested", it means the Google OAuth app is in Testing mode in Google Cloud Console.
   - Solution: The app developer/owner can either switch Publishing Status to "In Production" in Google Cloud Console -> OAuth Consent Screen, or add the user's Gmail to "Test Users".
   - Standard Google login uses only non-sensitive scopes ("openid", "email", "profile").

5. CONTACT & SUPPORT:
   - Official WhatsApp Support: +923174383702 (WhatsApp link: https://wa.me/923174383702).
   - Official Website: https://lead-scraper-mxs5.vercel.app
   - Keep responses helpful, concise, well-formatted with markdown bullets, and under 150 words.
   - Always encourage contacting on WhatsApp for payment and account activation.
`;

function getFallbackReply(message: string): { reply: string; suggested_actions: Array<{ label: string; url: string }> } {
  const lower = message.toLowerCase();

  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("how much") || lower.includes("rate")) {
    return {
      reply: `**USMAN AI GTM Pricing Plans:**\n\n• **Basic Plan ($25 / 30 Days)**: Includes up to 5,000 verified B2B leads, real-time search engine, direct Gmail outreach (500 emails/day free), and standard AI email assistant.\n• **Lifetime Plan ($100 One-Time)**: Permanent lifetime access with zero monthly fees, unlimited searches, the exclusive **AI Lead Research Agent**, and priority WhatsApp support.\n\nTo activate your account, message the Owner on WhatsApp (+923174383702).`,
      suggested_actions: [
        { label: "Purchase via WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20a%20subscription" },
        { label: "View Pricing Page", url: "/pricing" }
      ]
    };
  }

  if (lower.includes("activate") || lower.includes("lock") || lower.includes("tala") || lower.includes("unlock") || lower.includes("buy") || lower.includes("whatsapp")) {
    return {
      reply: `**How Account Activation Works:**\n\n1. Sign in with Google on USMAN AI GTM.\n2. New accounts start in **LOCKED** status for security.\n3. Message the Founder directly on WhatsApp at **+923174383702** with your registered email and desired plan ($25 Basic or $100 Lifetime).\n4. Your account is instantly activated with full search, lead exports, and Gmail outreach enabled!`,
      suggested_actions: [
        { label: "Chat on WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20account" },
        { label: "Go to Login", url: "/login" }
      ]
    };
  }

  if (lower.includes("gmail") || lower.includes("oauth") || lower.includes("blocked") || lower.includes("email")) {
    return {
      reply: `**Gmail Outreach & Google OAuth:**\n\n• Connect your personal Gmail account via official Google OAuth 2.0 in **Settings > Email Accounts**.\n• You can send up to 500 personalized emails daily for free through Google's official infrastructure.\n• If you encounter **"Access blocked: App is currently being tested"**, the developer can instantly add your email to the Google Cloud Test Users list or switch the app status to In Production in Google Cloud Console.`,
      suggested_actions: [
        { label: "Connect Gmail in App", url: "/app/accounts" },
        { label: "Help via WhatsApp", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20need%20help%20connecting%20Gmail" }
      ]
    };
  }

  if (lower.includes("search") || lower.includes("lead") || lower.includes("scrape") || lower.includes("find")) {
    return {
      reply: `**How B2B Lead Extraction Works:**\n\n• Enter any business niche/keyword (e.g. *Real Estate Agencies*, *Mobile Accessories*) and choose your target country.\n• The engine aggregates real-time records from Google Places and verified public domains.\n• Every qualifying lead includes authentic public email addresses, phone numbers, ratings, and domains.\n• Export your saved leads to Excel (.xlsx) or PDF with 1 click!`,
      suggested_actions: [
        { label: "Open Lead Search Engine", url: "/app/leads" },
        { label: "View Saved Leads", url: "/app/saved-leads" }
      ]
    };
  }

  return {
    reply: `Welcome to **USMAN AI GTM**! I am your AI Support Assistant.\n\nI can help you with:\n• **Lead Generation Engine**: How to discover verified B2B prospects.\n• **Gmail Outreach**: Sending personalized cold emails at $0 cost.\n• **Subscriptions**: $25 / 30 Days (Basic) or $100 (Lifetime Access).\n• **Account Activation**: Immediate manual activation via WhatsApp (+923174383702).\n\nHow can I help you today?`,
    suggested_actions: [
      { label: "Contact Owner on WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      { label: "View Plans & Pricing", url: "/pricing" }
    ]
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ reply: "Please ask a question.", suggested_actions: [] }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey || apiKey.length < 10) {
      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    }

    // Call Gemini 3.5 Flash Lite
    try {
      const contents = [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_KNOWLEDGE}\n\nUser Question: ${userMessage}` }],
        },
      ];

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contents }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return NextResponse.json({
            reply: text,
            suggested_actions: [
              { label: "Chat on WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%20AI%20Support" },
              { label: "View Pricing Plans", url: "/pricing" },
            ],
          });
        }
      }

      // If Gemini returned an error or rate limit, use the grounded fallback
      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    } catch {
      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    }
  } catch (err: any) {
    return NextResponse.json({
      reply: "I am currently online. For immediate assistance or account activation, please contact the Founder directly on WhatsApp (+923174383702).",
      suggested_actions: [
        { label: "Contact WhatsApp (+923174383702)", url: "https://wa.me/923174383702" }
      ]
    });
  }
}
