import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_KNOWLEDGE = `
You are the official Conversational Sales & Support AI Agent for USMAN AI GTM (Website: https://lead-scraper-mxs5.vercel.app/).
You represent the founder (Usman) and the platform.

CORE PERSONALITY & BEHAVIOR:
- Warm, consultative, professional, and helpful.
- MULTILINGUAL: Detect the user's language automatically and respond in the same language:
  - If user writes in English -> Respond in fluent English.
  - If user writes in Urdu (اردو) -> Respond in polite, natural Urdu (اردو رسم الخط).
  - If user writes in Roman Urdu (e.g. "kese buy krein", "tala kese khulay ga", "price kya hai") -> Respond in clean, natural Roman Urdu.
- MULTI-TURN MEMORY: Maintain conversation context and answer follow-up questions accurately.

STRICT SECURITY & PRIVACY GUARD:
- NEVER reveal, quote, or guess database passwords, connection strings, JWT tokens, OAuth client secrets, or private API keys.
- NEVER disclose or search other users' private lead lists, workspace names, or email accounts.
- If a user asks for secret credentials, politely explain that customer data and infrastructure secrets are strictly isolated and confidential.

GENUINE PLATFORM INFORMATION:
1. WHAT IS USMAN AI GTM:
   A premium B2B lead generation and cold outreach SaaS built for sales teams, agencies, and entrepreneurs.
   Core features include:
   - High-Speed B2B Lead Search Engine: Discovers authentic public emails, phone numbers, and domains across 193 countries.
   - Google Maps Business Lead Generator (EXCLUSIVE TO $100 LIFETIME PLAN): Scrapes verified local businesses with Google Places, crawls websites for contact emails, and supports mutual exclusive filtering (Email Only, Phone Only, Both).
   - Direct Gmail Integration: Authenticated via Google OAuth 2.0 to send cold outreach directly from personal Gmail accounts (500 free emails/day, zero cold email provider fees).
   - Gemini AI Email Assistant: Creates natural, high-converting B2B emails without corporate fluff.
   - AI Lead Research Agent (EXCLUSIVE TO $100 LIFETIME PLAN): Deep-dives into target companies to identify growth bottlenecks and draft custom-tailored outreach proposals.

2. PRICING & SUBSCRIPTION PLANS:
   - Basic Plan: $25 / 30 Days
     • Up to 5,000 verified leads per month.
     • Multi-platform non-Maps web search engine.
     • Personal Gmail outreach integration (500 free emails/day).
     • Standard AI email generator.
     • 30 days active access. Auto-locks upon expiry until renewed.
   - Lifetime Plan: $100 One-Time (Permanent Access)
     • Permanent lifetime access — zero monthly fees forever!
     • Unlimited search engine access.
     • EXCLUSIVE: Google Maps Business Lead Generator.
     • EXCLUSIVE: AI Lead Research Agent.
     • Multi-Gmail mailbox rotation.
     • Priority WhatsApp support directly from the Founder.

3. HOW TO PURCHASE & ACTIVATE ACCOUNT:
   - Step 1: Sign in with Google on https://lead-scraper-mxs5.vercel.app/login.
   - Step 2: New accounts start in LOCKED status for safety.
   - Step 3: Message the Founder directly on WhatsApp at +923174383702 (https://wa.me/923174383702).
   - Step 4: Pay via Bank Transfer / EasyPaisa / JazzCash / Crypto / Card ($25 for Basic or $100 for Lifetime).
   - Step 5: The Founder instantly activates the account and all features unlock immediately!

4. CONTACT & WHATSAPP SUPPORT:
   - WhatsApp Support: +923174383702
   - Website: https://lead-scraper-mxs5.vercel.app
   - Keep answers clear, structured with markdown bullet points, and friendly.
`;

function detectLanguage(text: string): "urdu" | "roman_urdu" | "english" {
  const lower = text.toLowerCase();
  // Check for Arabic/Urdu unicode script
  if (/[\u0600-\u06FF]/.test(text)) {
    return "urdu";
  }
  // Check common Roman Urdu words
  const romanUrduWords = [
    "kya", "kia", "hai", "hain", "kese", "kaise", "kro", "karo", "muje", "mujhe",
    "batao", "btao", "tala", "chahiye", "kitna", "kitne", "paisa", "paise", "rupay",
    "krna", "karna", "acha", "theek", "shukriya", "bhai", "janab", "karo", "hoga"
  ];
  const words = lower.split(/\s+/);
  const matched = words.filter((w) => romanUrduWords.includes(w));
  if (matched.length >= 2 || (matched.length === 1 && words.length <= 4)) {
    return "roman_urdu";
  }
  return "english";
}

function getFallbackReply(message: string): { reply: string; suggested_actions: Array<{ label: string; url: string }> } {
  const lang = detectLanguage(message);
  const lower = message.toLowerCase();

  if (lang === "urdu") {
    return {
      reply: `**عثمان اے آئی جی ٹی ایم (USMAN AI GTM) میں خوش آمدید!**\n\n• **بیسک پلان ($25 / 30 دن)**: 5,000 تصدیق شدہ لیڈز، جی میل آؤٹ ریچ (روزانہ 500 مفت ای میلز)، اور عام سرچ انجن۔\n• **لائف ٹائم پلان ($100 ایک بار)**: مستقل رسائی، گوگل میپس بزنس لیڈ جنریٹر، اے آئی لیڈ ریسرچ ایجنٹ، اور لامحدود سرچ۔\n\nاکاؤنٹ ایکٹیویٹ کروانے کے لیے واٹس ایپ پر رابطہ کریں: **+923174383702**`,
      suggested_actions: [
        { label: "واٹس ایپ پر رابطہ کریں (+923174383702)", url: "https://wa.me/923174383702?text=%D8%B9%D8%AB%D9%85%D8%A7%D9%86%20%D8%A8%DA%BE%D8%A7%D8%A6%DB%8C%20%D8%A7%DA%A9%D8%A7%D8%A4%D9%86%D8%B7%20%D8%A7%DB%8C%DA%A9%D9%B9%DB%8C%D9%88%DB%8C%D9%B9%20%DA%A9%D8%B1%D9%88%D8%A7%D9%86%D8%A7%20%DB%81%DB%8C" },
        { label: "پلانز دیکھیں", url: "/pricing" },
      ],
    };
  }

  if (lang === "roman_urdu") {
    return {
      reply: `**USMAN AI GTM Plans & Activation:**\n\n• **Basic Plan ($25 / 30 Din)**: 5,000 verified B2B leads, web search, personal Gmail integration (500 free daily emails).\n• **Lifetime Plan ($100 One-Time)**: Permanent access, Google Maps Lead Generator, AI Research Agent, multi-Gmail rotation aur zero monthly fees!\n\nAccount ka tala khulwane ya subscription lene k liye WhatsApp per Founder se rabta karein: **+923174383702**`,
      suggested_actions: [
        { label: "WhatsApp per Rabta Karein (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20account%20activate%20krwana%20hai" },
        { label: "Pricing Page", url: "/pricing" },
      ],
    };
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("rate") || lower.includes("how much")) {
    return {
      reply: `**USMAN AI GTM Pricing & Capabilities:**\n\n• **Basic Plan ($25 / 30 Days)**:\n  - Up to 5,000 verified B2B leads per month.\n  - Multi-source organic web search engine across 193 countries.\n  - Direct personal Gmail outreach (500 free emails/day).\n  - Standard Gemini email generator.\n  - Auto-locks after 30 days unless renewed.\n\n• **Lifetime Plan ($100 One-Time — Recommended)**:\n  - Permanent access with zero monthly renewals!\n  - **Exclusive Google Maps Business Lead Generator** (scrape local businesses with emails & phones).\n  - **Exclusive AI Lead Research Agent** (deep target company intelligence).\n  - Multi-Gmail account rotation.\n  - Priority Founder WhatsApp support.\n\nTo activate your account instantly, contact the Owner on WhatsApp (+923174383702).`,
      suggested_actions: [
        { label: "Activate via WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20my%20subscription" },
        { label: "View Pricing Plans", url: "/pricing" },
      ],
    };
  }

  if (lower.includes("activate") || lower.includes("lock") || lower.includes("unlock") || lower.includes("buy")) {
    return {
      reply: `**How to Activate Your Account:**\n\n1. Sign in with Google on USMAN AI GTM (accounts start in **LOCKED** status).\n2. Message the Founder directly on WhatsApp at **+923174383702**.\n3. Mention your registered email and chosen plan ($25 Basic 30-Day or $100 Lifetime).\n4. After payment verification, your account is immediately unlocked with full search and outreach access!`,
      suggested_actions: [
        { label: "Message Founder on WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20account" },
        { label: "Go to Login", url: "/login" },
      ],
    };
  }

  return {
    reply: `Welcome to **USMAN AI GTM**! I am your AI Sales & Support Assistant.\n\nI can help you with:\n• **B2B Lead Search**: How to find verified business leads globally.\n• **Google Maps Lead Generator**: Exclusive $100 Lifetime tool for local business leads.\n• **Gmail Outreach**: Sending up to 500 cold emails daily at $0 cost.\n• **Account Activation**: Fast manual unlocking via WhatsApp (**+923174383702**).\n\nWhat would you like to know?`,
    suggested_actions: [
      { label: "Contact Owner on WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      { label: "View Plans & Pricing", url: "/pricing" },
    ],
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

    // Build multi-turn Gemini conversation contents
    try {
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Add system knowledge preamble to first turn
      const recentHistory = history.slice(-6); // Keep last 3 turns
      if (recentHistory.length > 0) {
        contents.push({
          role: "user",
          parts: [{ text: `[System Instruction]\n${SYSTEM_KNOWLEDGE}\n\n[Previous Conversation Start]\n${recentHistory[0].content}` }],
        });
        if (recentHistory[0].role === "assistant") {
          contents[0].role = "model";
        }
        for (let i = 1; i < recentHistory.length; i++) {
          const h = recentHistory[i];
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        }
        // Add current user message
        contents.push({
          role: "user",
          parts: [{ text: userMessage }],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: `${SYSTEM_KNOWLEDGE}\n\nUser Question: ${userMessage}` }],
        });
      }

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
        { label: "Contact WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      ],
    });
  }
}
